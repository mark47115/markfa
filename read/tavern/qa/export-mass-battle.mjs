import assert from 'node:assert/strict';
import { constants } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const project = new URL('../', import.meta.url);
const unity = path.resolve(process.argv[2] ?? 'E:/My project');
const readProject = name => readFile(new URL(name, project), 'utf8');
const [rosterJson, motionJson, factions, captains, monsters] = await Promise.all([
  readProject('media/unit-sprites/roster-v2/manifest.json'),
  readFile(path.join(unity, 'Assets/Art/AlliedMotion/manifest.json'), 'utf8'),
  readProject('docs/faction-roster.md'),
  readProject('docs/captain-roster.md'),
  readProject('docs/enemy-character-design.md'),
]);
const roster = JSON.parse(rosterJson).units;
const motions = new Map(JSON.parse(motionJson).units.map(unit => [unit.id, unit]));
const statSources = factions + '\n' + captains;
const enemyStats = new Map(monsters.split(/\r?\n/).filter(line => line.startsWith('| ')).map(line =>
  line.slice(1, -1).split('|').map(cell => cell.trim()),
).filter(cells => cells.length === 6 && /^\d+\/\d+$/.test(cells[2])).map(cells => [cells[0], cells]));

const allies = roster.filter(unit => unit.kind !== 'void').map(unit => {
  const motion = motions.get(unit.id);
  assert.ok(motion, `Missing animated unit ${unit.id}`);
  const pattern = unit.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...statSources.matchAll(new RegExp(pattern + ' (\\d+)/(\\d+)', 'g'))];
  const stats = matches[0]?.slice(1) ??
    (unit.id === 'alloy-spearman' ? factions.match(/합금 창병은 (\d+)공격력·(\d+)체력/)?.slice(1) :
      unit.id === 'work-robot' ? factions.match(/영구 작업 로봇은 (\d+)\/(\d+)/)?.slice(1) : undefined);
  assert.ok(stats, `Missing documented stats for ${unit.id}`);
  const [attack, health] = stats.map(Number);
  return {
    id: unit.id, attack, health,
    ...(motion.profile === 'ranged' ? { ranged: true } : {}),
    ...(motion.profile === 'guard' ? { guard: true } : {}),
    ...(unit.id === 'allies-209' ? { skill: 'Rally' } : { rallyRecipient: true }),
    ...(unit.id === 'wolf-javelin' ? { skill: 'MarkedThrow' } : {}),
  };
});

const enemyArt = roster.filter(unit => unit.kind === 'void');
const enemies = enemyArt.map(unit => {
  const design = enemyStats.get(unit.name);
  assert.ok(design, `Missing documented stats for ${unit.id}`);
  const [, , stats, role, effect] = design;
  const [attack, health] = stats.split('/').map(Number);
  const shield = Number(effect.match(/시작 보호막 (\d+)/)?.[1] ?? 0);
  return {
    id: unit.id, attack, health,
    ...(role.includes('원거리') ? { ranged: true } : {}),
    ...(role.includes('도발') ? { guard: true } : {}),
    ...(role.includes('부활') ? { rebirth: true } : {}),
    ...(shield ? { shield } : {}),
    ...(unit.id === 'ruin-shell' ? { marked: true } : {}),
    ...(unit.id === 'void-291' ? { passive: 'FirstHitArmor' } : {}),
    ...(unit.id === 'void-298' ? { skill: 'Mend' } : {}),
  };
});

assert.equal(motions.size, 276);
assert.equal(new Set(allies.map(unit => unit.id)).size, motions.size);
assert.equal(new Set(enemies.map(unit => unit.id)).size, 32);
const dataDir = path.join(unity, 'Assets/Data/Battle');
const spriteDir = path.join(unity, 'Assets/Art/Enemies');
await mkdir(dataDir, { recursive: true });
await mkdir(spriteDir, { recursive: true });
for (const unit of enemyArt) {
  try {
    await copyFile(new URL(unit.path, project), path.join(spriteDir, unit.id + '.png'), constants.COPYFILE_EXCL);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}
await writeFile(path.join(dataDir, 'mass-battle.json'), JSON.stringify({ allies, enemies }, null, 2) + '\n');
console.log(`Exported ${allies.length} allied units and ${enemies.length} enemy units.`);
