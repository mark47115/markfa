import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const [characterDoc, waveDoc] = await Promise.all(['enemy-character-design.md', 'enemy-waves.md'].map(
  name => readFile(new URL('../docs/' + name, import.meta.url), 'utf8'),
));
const tableRows = markdown => markdown.split(/\r?\n/).filter(line => line.startsWith('| ')).map(
  line => line.slice(1, -1).split('|').map(cell => cell.trim()),
);
const general = tableRows(characterDoc);
const units = new Map(general.filter(row => row.length === 6 && /^\d+\/\d+$/.test(row[2])).map(
  ([name, rank, stats, tags, , bonus]) => {
    const [attack, health] = stats.split('/').map(Number);
    const [extra, tactical] = bonus.split('/').map(Number);
    return [name, { name, rank, attack, health, extra, tactical, tags }];
  },
));
const powers = new Map(general.filter(row => row.length === 4 && /^\d/.test(row[3])).map(
  ([name, , , weights]) => [name, weights.split('/').map(Number)],
));
const stages = new Map([['Ⅰ', 1], ['Ⅱ', 2], ['Ⅲ', 3]]);
const shopPowers = new Set(['봉인', '소용돌이', '탐식', '서리']);
const slots = spec => spec.split(' · ').map(name => name === '—' ? null : name);
const waves = tableRows(waveDoc).filter(row => /^R\d{2}[A-E]$/.test(row[0])).map(
  ([id, title, spec, front, rear, response]) => {
    const match = spec.match(/ ([ⅠⅡⅢ])$/);
    return {
      id, title, front: slots(front), rear: slots(rear), response,
      round: Number(id.slice(1, 3)), power: match ? spec.slice(0, -2) : spec,
      stage: match ? stages.get(match[1]) : 0,
    };
  },
);
const rounds = Array.from({ length: 15 }, (_, i) => waves.filter(wave => wave.round === i + 1));

let checks = 0;
function check(condition, message) {
  assert.ok(condition, message);
  checks++;
}
function equal(actual, expected, message) {
  assert.deepEqual(actual, expected, message);
  checks++;
}

equal(units.size, 32, 'Enemy roster count');
equal(powers.size - 1, 14, 'Active power count');
equal(waves.length, 75, 'Five formations for all fifteen rounds');
equal(new Set(waves.map(wave => wave.id)).size, 75, 'Unique formation IDs');
equal(new Set(waves.map(wave => wave.title)).size, 75, 'Unique titles');
equal(new Set(waves.map(wave => wave.power)).size, powers.size, 'Every power is used');

function formation(wave) {
  return [...wave.front, ...wave.rear].filter(Boolean);
}
for (const wave of waves) {
  const id = wave.id;
  const roster = formation(wave);
  check(wave.front.length === 3 && wave.rear.length === 3 && roster.length > 0, id + ' grid');
  check(roster.every(name => units.has(name) && units.get(name).rank !== '소환'), id + ' original units');
  check(powers.has(wave.power) && (wave.power === '권능 없음' ? wave.stage === 0 : wave.stage >= 1 && wave.stage <= 3), id + ' power and rank');
  check(wave.response.trim().length > 0, id + ' visible counterplay');
}
equal(new Set(waves.flatMap(formation)).size, units.size - 1, 'Every non-summon unit is used');

const scenarios = {
  standard: [1, 0.55, 0.75, 1],
  burst: [1.25, 0.4, 0.55, 1.1],
  sustain: [0.8, 0.75, 1.05, 0.85],
};
function threat(wave, weights) {
  const front = wave.front.map(name => units.get(name) ?? null);
  const rear = wave.rear.filter(Boolean).map(name => units.get(name));
  const roster = [...front.filter(Boolean), ...rear];
  const boss = roster.some(unit => unit.rank === '보스');
  const split = units.get('분열체');
  const coverage = front.some(unit => unit?.tags.includes('도발')) ? 0.65 * Math.min(rear.length, 2) : 0;
  const rearFire = rear.filter(unit => unit.tags.includes('원거리')).length * 0.45;
  const flank = [front[0], front[2]].filter(unit => unit?.tags.includes('측면')).length * 0.45;
  const sum = project => roster.reduce((total, unit) => total + project(unit), 0);
  const power = wave.stage ? powers.get(wave.power)[wave.stage - 1] : 0;
  const components = [
    sum(unit => unit.attack) + (boss ? split.attack * 1.2 : 0),
    sum(unit => unit.health + unit.extra) + (boss ? split.health * 2 : 0),
    roster.length + (boss ? 1.2 : 0),
    sum(unit => unit.tactical) + power + coverage + rearFire + flank,
  ];
  return components.reduce((total, value, i) => total + value * weights[i], 0);
}
const average = numbers => numbers.reduce((total, value) => total + value, 0) / numbers.length;
const spread = numbers => (Math.max(...numbers) - Math.min(...numbers)) / average(numbers);
const roundReports = [];
for (const [index, candidates] of rounds.entries()) {
  const round = index + 1;
  equal(candidates.map(wave => wave.id.at(-1)).join(''), 'ABCDE', 'Stable candidate order for round ' + round);
  equal(new Set(candidates.map(wave => wave.power)).size, 5, 'Distinct powers in round ' + round);
  equal(new Set(candidates.map(wave => formation(wave).sort().join('/'))).size, 5, 'Distinct rosters in round ' + round);
  check(new Set(candidates.map(wave => JSON.stringify([...wave.front, ...wave.rear].map(Boolean)))).size >= 2, 'Different slot patterns in round ' + round);
  check(candidates.filter(wave => shopPowers.has(wave.power)).length <= 1, 'At most one economy roll per round');

  const scoresByScenario = Object.fromEntries(Object.entries(scenarios).map(([name, weights]) => [name, candidates.map(wave => threat(wave, weights))]));
  const normal = scoresByScenario.standard;
  const spreads = Object.fromEntries(Object.entries(scoresByScenario).map(([name, values]) => [name, spread(values)]));
  check(spreads.standard <= 0.18, 'Normal score spread within 18%, round ' + round);
  check(Math.max(spreads.burst, spreads.sustain) <= 0.25, 'Stress spread within 25%, round ' + round);
  roundReports.push({
    round, average: average(normal), minimum: Math.min(...normal), maximum: Math.max(...normal),
    lowId: candidates[normal.indexOf(Math.min(...normal))].id,
    highId: candidates[normal.indexOf(Math.max(...normal))].id,
    ...spreads,
  });
}
for (const [index, result] of roundReports.slice(1).entries()) {
  const growth = result.average / roundReports[index].average - 1;
  check(growth > 0 && (result.round <= 3 || growth <= 0.30), 'Increasing round progression within post-tutorial target');
}
const finalGrowth = roundReports.at(-1).average / roundReports.at(-2).average - 1;
check(finalGrowth > 0.08 && finalGrowth < 0.16, 'Finale has its own increase without a spike');
check(rounds.slice(0, 2).flat().every(wave => !shopPowers.has(wave.power)), 'First two rounds have no shop interference');
check(rounds[0].every(wave => {
  const first = units.get(formation(wave)[0]);
  return first.attack + (wave.power === '첫니' ? wave.stage : 0) <= 2;
}), 'Round one opening hit stays at two or below');

function splitSlots(wave) {
  const bossIndex = wave.front.indexOf('삼키는 자');
  const layers = [wave.front, wave.rear];
  return layers.flatMap((layer, row) => [0, 1, 2]
    .filter(column => !layer[column] || (row === 0 && column === bossIndex))
    .sort((a, b) => Math.abs(a - bossIndex) - Math.abs(b - bossIndex) || a - b)
    .map(column => row * 3 + column)).slice(0, 2);
}
for (const final of rounds[14]) {
  equal(formation(final).filter(name => units.get(name).rank === '보스'), ['삼키는 자'], final.id + ' boss roster');
  const start = [...final.front, ...final.rear];
  const spaces = splitSlots(final);
  check(spaces.length === 2 && spaces.every(i => !start[i] || start[i] === '삼키는 자'), final.id + ' split has two non-overlapping cells');
}

function locks(tables, rank) {
  return Math.min([1, 1, 2][rank - 1], Math.max(0, tables - 3));
}
equal([3, 4, 5].map(tables => tables - locks(tables, 3)), [3, 3, 3], 'Seal keeps three tables');
for (const type of ['gluttony', 'vortex']) {
  const affected = (open, cap) => Math.min(cap, Math.max(0, open - (type === 'gluttony' ? 1 : 0)));
  equal([affected(0, 3), affected(1, 3), affected(4, 3)], type === 'gluttony' ? [0, 0, 3] : [0, 1, 3], 'One-shot offer change, excluding protected offers');
}
const snipe = (health, rate, cap) => health - Math.min(health - 1, Math.floor(health * rate), cap);
equal([snipe(1, .25, 6), snipe(8, .25, 6), snipe(100, .25, 6)], [1, 6, 94], 'Snipe floor and cap');
const stolen = (buff, cap) => Math.min(cap, Math.floor(Math.max(0, buff) / 2));
equal([-10, 1, 2, 9, 30].map(buff => stolen(buff, 4)), [0, 0, 1, 4, 4], 'Theft cannot copy unbounded growth');

function route(seed) {
  return rounds.map((candidates, i) => {
    const limit = Math.floor(2 ** 32 / candidates.length) * candidates.length;
    for (let attempt = 0; ; attempt++) {
      const n = createHash('sha256').update('cavern-enemy-v1:' + seed + ':' + (i + 1) + ':' + attempt).digest().readUInt32LE();
      if (n < limit) return candidates[n % candidates.length].id;
    }
  });
}
equal(route('playtest-37'), route('playtest-37'), 'Same seed yields the same saved route');
check(route('playtest-37').some((id, i) => id !== route('playtest-38')[i]), 'New seed yields a different route');
const seedCount = 5000;
const buckets = rounds.map(() => Array(5).fill(0));
const scoreById = new Map(waves.map(wave => [wave.id, threat(wave, scenarios.standard)]));
const routeScores = [];
for (let seed = 0; seed < seedCount; seed++) {
  const picks = route(seed);
  routeScores.push(picks.reduce((score, id) => score + scoreById.get(id), 0));
  for (const [round, id] of picks.entries()) buckets[round][id.charCodeAt(3) - 65]++;
}
const frequencies = buckets.flat().map(count => count / seedCount);
check(frequencies.every(frequency => Math.abs(frequency - 0.2) < 0.025), 'Each candidate is close to the theoretical 20% in seed sampling');
const exampleRoute = route('playtest-37');
const routeAverage = average(roundReports.map(r => r.average)) * roundReports.length;
routeScores.sort((a, b) => a - b);
const routePercentiles = [0.05, 0.95].map(p => routeScores[Math.floor(p * (seedCount - 1))]);
check(routePercentiles[0] < routeAverage && routePercentiles[1] > routeAverage, 'Sampled route range surrounds analytic mean');

const shopRates = rounds.map(candidates => candidates.filter(wave => shopPowers.has(wave.power)).length / 5);
let noPreviousShop = 1;
let previousShop = 0;
for (const chance of shopRates) {
  const remaining = (noPreviousShop + previousShop) * (1 - chance);
  previousShop = noPreviousShop * chance;
  noPreviousShop = remaining;
}
console.log(JSON.stringify({
  checks, roundReports, finalGrowth, seedCount, exampleRoute, routeAverage, routePercentiles,
  frequencies: [Math.min(...frequencies), Math.max(...frequencies)],
  expectedShopRounds: shopRates.reduce((a, b) => a + b, 0),
  consecutiveShopProbability: 1 - noPreviousShop - previousShop,
}, null, 2));

const [exportFlag, destination] = process.argv.slice(2);
if (exportFlag === '--export-r01a') {
  assert.ok(destination, 'Provide the Unity encounter JSON path.');
  const { arena, rounds: maps } = JSON.parse(await readFile(new URL('../battle-maps.json', import.meta.url), 'utf8'));
  const wave = waves.find(candidate => candidate.id === 'R01A');
  const map = maps.find(candidate => candidate.id === 'r01');
  assert.equal(map.reviewWave, wave.id);
  assert.equal(map.obstacles.length, 0, 'The first Unity encounter requires open terrain.');
  assert.equal(wave.power, '권능 없음');
  const enemies = [wave.front, wave.rear].flatMap((slots, row) => slots.flatMap((name, column) => {
    if (name === null) return [];
    const unit = units.get(name);
    assert.equal(name, '틈새 추적자', 'Add the enemy art and combat rules before exporting a new unit.');
    assert.equal(unit.tags, '근접');
    return [{ artId: 'void-274', row, column, attack: unit.attack, health: unit.health }];
  }));
  const encounter = {
    id: wave.id,
    title: wave.title,
    map: {
      id: map.id, title: map.name, bounds: arena.bounds,
      allyLine: arena.allies.line, enemySlots: arena.enemies,
    },
    enemies,
  };
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, JSON.stringify(encounter, null, 2) + '\n', 'utf8');
}
