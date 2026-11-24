// Copies the pixelfx runtime and the Tavern Heros cue effects into the battle-actions tab, which can only read
// files inside its own folder. Run again after editing work/pixelfx/src/fx/tavern.
//   node qa/sync-pixelfx.mjs
import { cpSync, rmSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const card = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(card, '../../work/pixelfx');
const target = path.join(card, 'media/unit-sprites/battle-actions/pixelfx');
if (!existsSync(path.join(source, 'src/core/index.js'))) throw new Error(`pixelfx not found at ${source}`);
rmSync(target, { recursive: true, force: true });
mkdirSync(path.join(target, 'src/fx'), { recursive: true });
cpSync(path.join(source, 'src/core'), path.join(target, 'src/core'), { recursive: true });
cpSync(path.join(source, 'src/fx/tavern'), path.join(target, 'src/fx/tavern'), { recursive: true });
for (const file of ['LICENSE', 'NOTICE.md']) copyFileSync(path.join(source, file), path.join(target, file));
console.log('pixelfx runtime copied to', path.relative(card, target));
