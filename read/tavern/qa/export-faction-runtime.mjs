import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const workspace = new URL('../', import.meta.url);
const unity = path.resolve(process.argv[2] ?? 'E:/My project');
const [roster, sprites, motions, skillDoc, captainRoster] = await Promise.all([
  readFile(new URL('docs/faction-roster.md', workspace), 'utf8'),
  readFile(new URL('media/unit-sprites/roster-v2/manifest.json', workspace), 'utf8').then(JSON.parse),
  readFile(path.join(unity, 'Assets/Art/AlliedMotion/manifest.json'), 'utf8').then(JSON.parse),
  readFile(new URL('docs/unit-active-skills.md', workspace), 'utf8'),
  readFile(new URL('docs/captain-roster.md', workspace), 'utf8'),
]);
const mechanics = ['Blessing','Shapeshift','Reforge','Equipment','Hunt','Pursuit','Guard','Retribution',
  'Production','Overload','Supply','Escort','Rage','Rally'];
const skillIds = ['GreenShade','SpareLoad','PursuitSignal','ShieldRelay','PowerShare','EmergencyVial','Rally',
  'RakeSweep','EmberScatter','MarkedThrow','OathCounter','CapacitorBurst','ShieldFeint','RageStomp'];
const skills = new Map([...skillDoc.matchAll(/^\| (.+?) \| (.+?) · (.+?) \| (.+?) \| ([\d.]+) \/ ([\d.]+|전투 1회) \/ ([\d.]+) \| (.+?) \|$/gm)]
  .map(([, , , unit, name], index) => [unit, { name, id: skillIds[index] }]));
assert.equal(skills.size, 14);
const byName = new Map(sprites.units.filter(unit => unit.kind !== 'void').map(unit => [unit.name, unit.id]));
const profiles = new Map(motions.units.map(unit => [unit.id, unit.profile]));
const mechanicsByName = new Map();
const profilesById = new Map();
const unmatched = [];
const cards = [];
let group = 0;
for (const [index, section] of [...roster.matchAll(/^### (.+)\r?\n([\s\S]*?)(?=^#{2,3} |(?![\s\S]))/gm)].entries()) {
  const mechanic = mechanics[index];
  assert.ok(mechanic, section[1]);
  mechanicsByName.set(mechanic, section[1].trim());
  let support = 0;
  for (const [, tier, label, cardText, crew] of section[2].matchAll(/^\| ([1-5]) \| (.+?) \| (.+?) \| (.+?) \|\r?$/gm)) {
    const name = label.replace(/ · 보조$/, '');
    const variant = label.endsWith(' · 보조') ? ++support : 0;
    const forms = crew.split(/\.\s+(?=동물형 |반인반수 )/).map(form => {
      const kind = form.startsWith('동물형 ') ? 'Animal' : form.startsWith('반인반수 ') ? 'Hybrid' : 'Human';
      const units = readTroops(form, name);
      assert.ok(units.length >= 2 && units.length <= 4, name);
      return { kind, units };
    });
    cards.push({ id: mechanic + '-' + tier + '-' + variant, name, mechanic, tier: Number(tier), support: variant, description: cardText, forms });
  }
}
assert.equal(cards.length, 98);
const commonTroops = cards.flatMap(card => card.forms.flatMap(form => form.units));
assert.equal(commonTroops.filter(unit => unit.skill).length, 14);
const captainTroops = [...captainRoster.matchAll(/^\| [135] \| (.+?) \| (.+?) \| (.+?) \|\r?$/gm)]
  .flatMap(([, name, , crew]) => readTroops(crew, name));
assert.equal(captainTroops.length, 60);
profilesById.set('temporary-shield-guard', {});
profilesById.set('reforged-shieldbearer', { effects: { firstHealthReduction: 1 } });
profilesById.set('alloy-spearman', { effects: { firstHit: 1 } });
profilesById.set('work-robot', {});
const dataDir = path.join(unity, 'Assets/Data/Battle');
await writeFile(path.join(dataDir, 'faction-roster.json'), JSON.stringify({ cards }, null, 2) + '\n');
const massPath = path.join(dataDir, 'mass-battle.json');
const mass = JSON.parse(await readFile(massPath, 'utf8'));
for (const ally of mass.allies) {
  const profile = profilesById.get(ally.id);
  assert.ok(profile, `missing profile for ${ally.id}`);
  if (profile.group) ally.group = profile.group;
  if (profile.skill) ally.skill = profile.skill;
  if (profile.effects) ally.effects = profile.effects;
}
await writeFile(massPath, JSON.stringify(mass, null, 2) + '\n');
console.log(JSON.stringify({ cards: cards.length, mechanics: mechanicsByName.size, commonTroops: commonTroops.length,
  captainTroops: captainTroops.length, unitProfiles: profilesById.size,
  skills: skills.size, implementedPassives: [...profilesById.values()].filter(unit => unit.effects).length,
  unmatched: new Set(unmatched.map(unit => unit.id)).size }, null, 2));
if (process.argv.includes('--unmatched')) console.log(JSON.stringify(unmatched, null, 2));

function readTroops(form, name) {
  const entries = [...form.matchAll(/(?:^|[.,] )(?:인간형 |동물형 |반인반수 )?([^.,·]+?) (\d+)\/(\d+) · /g)];
  const groupId = ++group;
  return entries.map((match, index) => {
    const [, character, attack, health] = match;
    const id = byName.get(character.trim());
    assert.ok(id, `${name} / missing art for ${character}`);
    const passive = form.slice(match.index + match[0].length, entries[index + 1]?.index ?? form.length)
      .replace(/ · 액티브 \[.+?\]\(unit-active-skills\.md\)/g, '').trim().replace(/\.$/, '');
    const effects = unitEffects(passive);
    if (effects === undefined && !['근접','원거리','기본 공격 원거리','원거리 기본 공격'].includes(passive))
      unmatched.push({ id, name: character, passive });
    const unit = { id, attack: Number(attack), health: Number(health), name: character.trim(), passive,
      ranged: profiles.get(id) === 'ranged', guard: profiles.get(id) === 'guard',
      skill: skills.get(character.trim())?.id ?? '', group: groupId, effects };
    profilesById.set(id, unit);
    return unit;
  });
}

function unitEffects(text) {
  text = text.replace(/^전투 중 (?!1회|최초 1회|처음 쓰러진)|^전투 (?=첫)/, '');
  if (text === '빠른 보행') return { move: 10 };
  if (text === '위 두 주력 스킬을 각각 1회') return { firstHealthReduction: 2, firstHit: 2 };
  const patterns = [
    [/^첫 (?:기본 |원거리 |근접 )?(?:공격|적중|투창)(?: 적중)?(?:에| 시)?(?: 추가)? 피해 \+?(\d+)(?: 추가)?$/, 'firstHit'],
    [/^첫 적중(?:에)? 추가 피해 (\d+)$/, 'firstHit'],
    [/^첫 공격이 몸이 닿는 가까운 적에게 피해 (\d+) 추가$/, 'firstContactHit'],
    [/^첫 체력 (?:피격 피해|피해)(?: 최대)? \+?(\d+) (?:경감|흡수)$/, 'firstHealthReduction'],
    [/^(?:첫 피격 피해|처음 맞은 피해)(?: 최대)? (\d+) (?:경감|흡수)$/, 'firstDamageReduction'],
    [/^(?:자신이 받는 첫 피격 피해|자신에게 들어오는 첫 피해|첫 피해) (\d+) 경감$/, 'firstDamageReduction'],
    [/^첫 체력 피격 후 자신이 살아 있으면 (\d+) 회복$/, 'onFirstWoundHeal'],
    [/^체력 50% 이하가 된 첫 순간에 자신 회복 (\d+)$/, 'halfHeal'],
    [/^처음 체력 50% 이하에서 보호막 (\d+)$/, 'halfShield'],
    [/^체력 50% 이하가 되면 최초 1회 보호막 (\d+)$/, 'halfShield'],
    [/^체력 50% 이하에서 처음으로 보호막 (\d+)$/, 'halfShield'],
    [/^첫 체력 50% 이하 시 체력 (\d+) 회복$/, 'halfHeal'],
    [/^체력 50% 이하에서 처음 받는 체력 피해 (\d+) 경감$/, 'halfReduction'],
    [/^첫 공격(?:이 맞으면| 적중 시)(?: 자기| 자신) 체력 (\d+) 회복$/, 'firstHitHeal'],
    [/^첫 적중에 방패가 남은 대상에게 추가 보호막 손실 최대 (\d+)$/, 'firstShieldStrip'],
    [/^첫 적 처치 관여 시 체력 (\d+) 회복$/, 'firstKillHeal'],
    [/^첫 체력 피격 때 자기 주변 가장 가까운 적에게 피해 (\d+)$/, 'firstWoundCounter'],
    [/^전투 중 처음 쓰러진 아군과 가장 가까운 적에게 피해 (\d+)$/, 'allyDownDamage'],
    [/^자기 기물의 다른 기본 유닛이 처음 체력 50% 이하로 떨어지면 자신에게 보호막 (\d+)$/, 'groupHalfShield'],
    [/^시작 보호막 (\d+)$/, 'openingShield'],
    [/^첫 실제 체력 (?:피격 )?피해를 (\d+)까지 경감$/, 'firstHealthReduction'],
    [/^생존 시 처음 자기 체력 50% 이하에서 (\d+) 회복$/, 'halfHeal'],
    [/^첫 기본 공격이 맞으면 자신의 체력 (\d+) 회복$/, 'firstHitHeal'],
    [/^첫 기본 공격 명중 시 자기 체력 (\d+) 회복$/, 'firstHitHeal'],
    [/^첫 기본 공격(?:의 기본 사거리| 준비 시간) (\d+)% 증가$/, 'firstRangePercent'],
    [/^첫 기본 공격 준비 시간 (\d+)% 단축$/, 'firstWindupPercent'],
    [/^처음 실제 체력 피해를 (?:준 적에게|받으면) (\d+) 반격 피해$/, 'firstWoundAttackerCounter'],
    [/^처음 공격 적중 시 체력 비율이 가장 낮은 가까운 아군 1명 회복 (\d+)$/, 'firstHitAllyHeal'],
  ];
  for (const [pattern, key] of patterns) {
    const match = text.match(pattern);
    if (match) return { [key]: Number(match[1]) };
  }
  const movement = text.match(/(\d+(?:\.\d+)?)초/)?.[1];
  const percent = text.match(/(\d+)%/)?.[1];
  if (movement && percent) {
    const ticks = Math.round(Number(movement) * 20), value = Number(percent);
    if (/^(?:자신을 처음 공격한 적|첫 피격을 준 적|처음 자신을 공격한 적)/.test(text))
      return { firstHurtTicks: ticks, firstHurtSlow: value };
    if (/^첫 .*(?:둔화|−\d+%|감소)/.test(text) && !text.includes('자신') && !text.startsWith('첫 체력'))
      return { slowTicks: ticks, slow: value };
    if (text.startsWith('자기 공격에 처음 피해를 입은 적'))
      return { effectiveSlowTicks: ticks, effectiveSlow: value };
    if (/^(?:처음 피해 준 적|자신에게 처음 피해 준 적|처음 자신에게 체력 피해 준 적)/.test(text))
      return { firstHurtTicks: ticks, firstHurtSlow: value, firstHurtHealthOnly: text.includes('체력 피해') };
    if (text.startsWith('원거리. 표식 적에게 처음 적중하면'))
      return { firstMarkedTicks: ticks, firstMarkedMove: value };
    if (text.startsWith('출전 직후 같은 기물의 다른 기본 유닛'))
      return { groupMoveTicks: ticks, groupMove: value };
  }
  const triage = text.match(/^전투(?: 중)? 1회, 체력 50% 아래인 가장 가까운 아군 1명에게 체력 (\d+) 회복$/);
  if (triage) return { healAlly: Number(triage[1]), healAllyBelow: 50 };
  if (text === '전투 중 최초 1회 가까운 아군의 받은 피해를 2 회복') return { healAlly: 2, healAllyBelow: 100 };
}
