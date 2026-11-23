import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchBrowser } from '../../../desktop/service/test/browser.mjs';
import { actions, attackPoses, attackTimes, clips, eventFrame, frame, weaponProfile } from './ally-motion-v2-poses.mjs';
import { reviewedCount, verifiedGear } from './ally-motion-gear.mjs';
import { articulatedGear } from './ally-motion-v4-guide.mjs';
import { articulatedActions, createArticulation } from './ally-motion-articulation.mjs';

const project = new URL('../', import.meta.url);
const base = 'media/unit-sprites/';
const articulated = process.argv.includes('--articulated-gear');
const reviewed = articulated || process.argv.includes('--reviewed-gear');
const version = articulated ? 4 : reviewed ? 3 : 2;
const definitions = articulated ? { ...actions, ...articulatedActions } : actions;
const output = new URL(base + 'ally-motion-v' + version + '/', project);
const packPath = process.argv.slice(2).find(arg => !arg.startsWith('--'));
const pack = packPath ? pathToFileURL(resolve(packPath) + sep) : null;
const roster = JSON.parse(await readFile(new URL(base + 'roster-v2/manifest.json', project), 'utf8'));
const revision = JSON.parse(await readFile(new URL(base + 'ally-motion-v1/manifest.json', project), 'utf8'));
const old = new Map(revision.units.map(unit => [unit.id, unit]));
const rosterById = new Map(roster.units.map(unit => [unit.id, unit]));
const manifest = { version, frame, clips, units: [] };
if (reviewed) assert.equal(reviewedCount, revision.units.length);
const url = bytes => 'data:image/png;base64,' + bytes.toString('base64');
const checksum = bytes => createHash('sha256').update(bytes).digest('hex');
const effectLabels = { contact: '타격', release: '발사', cast: '시전' };
await mkdir(new URL('png/', output), { recursive: true });
if (pack) await mkdir(new URL('png/', pack), { recursive: true });

const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  if (articulated) await page.addScriptTag({content:'window.createArticulation = ' + createArticulation.toString()});
  for (let offset = 0; offset < revision.units.length; offset += 14) {
    const batch = await Promise.all(revision.units.slice(offset, offset + 14).map(async unit => {
      const source = rosterById.get(unit.id);
      const profile = articulated ? articulatedGear(unit.id) : reviewed ? verifiedGear(unit.id) : weaponProfile(source, unit.profile);
      const bytes = await readFile(new URL(base + 'ally-motion-v1/' + unit.sheet, project));
      assert.equal(checksum(bytes), old.get(unit.id).sha256);
      return { id: unit.id, name: unit.name, ...profile, profile: unit.profile, reviewed, articulated, url: url(bytes) };
    }));
    const rows = await page.evaluate(async ({ batch, frame, clips, attackPoses, actions, attackTimes, eventFrame }) => {
      const size = frame.width;
      const step = (a, b, t) => a + (b - a) * t;
      const cap = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
      const surface = (w, h) => {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        return canvas.getContext('2d', { willReadFrequently: true });
      };
      function line(mark, ax, ay, bx, by, color, thick = 1) {
        const length = Math.max(Math.abs(bx - ax), Math.abs(by - ay), 1);
        for (let i = 0; i <= length; i++) {
          const x = Math.round(step(ax, bx, i / length));
          const y = Math.round(step(ay, by, i / length));
          for (let dy = 0; dy < thick; dy++) mark(x, y + dy, color);
        }
      }
      function decode(ctx, col, row) {
        const data = new Uint32Array(ctx.getImageData(64 * col, 64 * row, 64, 64).data.buffer);
        const pixels = [];
        for (let i = 0; i < data.length; i++) if (data[i] >>> 24) {
          pixels.push({ x: i % 64, y: i >> 6, color: data[i] });
        }
        return pixels;
      }
      function extent(pixels) {
        return {
          left: Math.min(...pixels.map(p => p.x)), right: Math.max(...pixels.map(p => p.x)),
          top: Math.min(...pixels.map(p => p.y)), bottom: Math.max(...pixels.map(p => p.y)),
        };
      }
      function contains(outline, x, y) {
        let inside = false;
        for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
          const [ax, ay] = outline[j], [bx, by] = outline[i];
          if ((ay > y) !== (by > y) && (x < (bx - ax) * (y - ay) / (by - ay) + ax)) inside = !inside;
        }
        return inside;
      }
      function bake(actor, source) {
        const original = decode(source, 0, 0);
        const geometry = extent(original);
        const feet = original.filter(p => p.y >= geometry.bottom - 2);
        const origin = feet.reduce((sum, p) => sum + p.x, 0) / feet.length;
        const xOffset = Math.round(frame.anchor[0] - .5 + origin);
        const maskShift = xOffset - (Math.round(frame.anchor[0] + origin) - 1);
        const yOffset = frame.groundY - geometry.bottom;
        const translated = pixels => pixels.map(p => ({ x: xOffset - p.x, y: yOffset + p.y, color: p.color }));
        const canonical = translated(original);
        const body = extent(canonical);
        const height = body.bottom - body.top;
        const chest = Math.round(body.top + height * .61);
        const waist = Math.round(body.top + height * (actor.type === 'beast' ? .66 : .76));
        const bodyCenter = Math.round((body.left + body.right) / 2);
        const colors = [...new Set(canonical.map(p => p.color))];
        const luma = c => ((c & 255) * 22 + ((c >>> 8) & 255) * 70 + ((c >>> 16) & 255) * 8) / 100;
        colors.sort((a, b) => luma(a) - luma(b));
        const [outline, trim] = colors, highlight = colors.at(-1);
        const weaponSide = actor.type === 'shield' && ['shield-deputy', 'citadel-captain'].includes(actor.id) ? -1 : 1;
        const width = body.right - body.left;
        // 대표 유닛은 88px 셀에서 머리와 실제 장비의 경계를 픽셀 단위로 지정한다.
        const anchors = {
          'allies-125': { grip:[52,61], edge:p=>p.x>=50 && p.y>=59 },
          'shield-deputy': { grip:[43,60], edge:p=>p.x<=42 && p.y>=51 && p.y<=71 },
          'sprout-archer': { grip:[52,61], edge:p=>p.x>=50 && p.y>=47 },
          'assembly-robot': { grip:[53,63], edge:p=>p.x>=53 && p.y>=56 },
          'lantern-priest': { grip:[52,60], edge:p=>p.x>=51 && p.y>=46 },
        };
        const authored = actor.reviewed ? actor.anchor : anchors[actor.id];
        const grip = authored ? [authored.grip[0] + (actor.reviewed ? 0 : maskShift), authored.grip[1]]
          : [bodyCenter + (actor.type === 'shield' ? 1 : Math.round(width * .16)) * weaponSide, chest];
        const attackPatch = canonical.filter(p => {
          if (actor.reviewed) return actor.anchor ? contains(actor.anchor.outline, p.x + .5, p.y + .5) : false;
          if (authored) return authored.edge({ x: p.x - maskShift, y: p.y });
          const side = (p.x - grip[0]) * weaponSide;
          const long = ['staff','spear','javelin','bow','bird'].includes(actor.type);
          const top = long && side > width * .15 ? body.top : chest - 5;
          const bottom = side > width * .16 || actor.type === 'shield' ? body.bottom - 1 : waist + 2;
          return side >= 0 && p.y >= top && p.y <= bottom;
        });
        const pickTip = actor.anchor ? { x: actor.anchor.tip[0], y: actor.anchor.tip[1] } : attackPatch.slice().sort((a, b) => {
          const weight = actor.type === 'staff' || actor.type === 'spear' ? 1.3 : .25;
          return (b.x - a.x) * weaponSide + (a.y - b.y) * weight;
        })[0] ?? { x: body.right, y: chest };
        const patch = new Map(attackPatch.map(p => [p.y * size + p.x, p.color]));
        const canonicalInk = new Set(canonical.map(p => p.y * size + p.x));
        const artColor = attackPatch.find(p => luma(p.color) > 110 && luma(p.color) < 190)?.color ?? trim;
        const clipped = (x, y) => x < 1 || x > size - 2 || y < 1 || y > size - 2;
        const sheet = surface(size * frame.columns, size * frame.rows);
        function tile(pose) {
          const pixels = new Uint32Array(size * size);
          const mark = (x, y, color) => {
            if (clipped(x, y)) throw Error(actor.id + ' sprite edge clipped at ' + x + ',' + y);
            pixels[y * size + x] = color;
          };
          pose(mark);
          return pixels;
        }
        function plain(pixels, dy = 0) {
          return tile(mark => { for (const p of pixels) mark(p.x, p.y + dy, p.color); });
        }
        const quiet = plain(canonical);
        const baseArt = tile(mark => { for (const p of canonical) mark(p.x, p.y, p.color); });
        const poseAttack = actor.articulated
          ? window.createArticulation({actor, canonical, colors, body, frame, tile, line, contains, baseArt, attackPoses})
          : attack;
        const mirrorGround = (col, row) => {
          const src = translated(decode(source, col, row));
          return plain(src, frame.groundY - extent(src).bottom);
        };
        function whole(mark, p, tx, ty) {
          mark(Math.round(p.x + tx), Math.round(p.y + ty), p.color);
        }
        function move(n) {
          if (actor.type !== 'bird' && actor.type !== 'beast') return mirrorGround(n, 1);
          const lead = [-3,-1,2,4,3,1,-2,-4][n];
          const raised = [0,1,2,1,0,1,2,1][n];
          return tile(mark => {
            for (const p of canonical) {
              if (actor.type === 'bird') {
                const wing = cap((bodyCenter - p.x) / Math.max(4, width * .47), 0, 1);
                whole(mark, p, 0, Math.round(-raised + (lead - raised) * wing));
              } else {
                const legs = cap((p.y - waist) / Math.max(1, body.bottom - waist), 0, 1);
                const front = p.x > bodyCenter;
                const spread = front ? lead : -lead;
                const lift = Math.max(0, (front ? -lead : lead)) * legs * .55;
                whole(mark, p, spread * legs, -Math.round(raised * (1 - legs) + lift));
              }
            }
          });
        }
        // 피격은 장비를 떼지 않고 한 줄씩 체중을 되돌려 윤곽을 이어 준다.
        function hurt(n) {
          if (n === 3) return quiet;
          return tile(mark => {
            const travel = [-4, -3, -1][n];
            for (const p of canonical) {
              const lift = cap((body.bottom - p.y) / height, 0, 1);
              whole(mark, p, travel * lift, (n === 0 ? 2 : 1) * lift);
            }
          });
        }
        function attack(key, index) {
          const [x, y, bend] = attackPoses[key][index];
          const [hip, low, chestPush, frontStep, rearStep] = attackPoses.body[index];
          const [label, effect, event] = actions[key];
          if (index === 0 || index === 9) return { pixels: baseArt, tip: [pickTip.x, pickTip.y], hand: grip };
          const fixedFeet = ['bow','bolt','cast','signal','wing','crossbow','gun','aim','drum'].includes(key);
          const heavy = actor.type === 'shield';
          const beast = actor.type === 'beast';
          const bentArm = actor.reviewed && actor.anchor && ['sword','axe'].includes(actor.family);
          const shoulder = [bodyCenter + hip + chestPush + (bentArm ? 2 : 0), chest + low];
          const hand = [grip[0] + hip + chestPush + x + (heavy && weaponSide === -1 && index >= 5 && index <= 6 ? 3 : 0), grip[1] + low + y];
          if (bentArm) {
            const [dx, dy] = [hand[0] - shoulder[0], hand[1] - shoulder[1]];
            const reach = Math.max(10, Math.hypot(grip[0] - bodyCenter - 2, grip[1] - chest) + 3);
            const amount = Math.min(1, reach / Math.max(1, Math.hypot(dx, dy)));
            hand[0] = Math.round(shoulder[0] + dx * amount);
            hand[1] = Math.round(shoulder[1] + dy * amount);
          }
          const swordDirection = {
            cutUp: [0,20,38,52,25,-43,-66,-46,-16,0],
            cutDown: [0,-25,-54,-88,-66,48,63,46,23,0],
            stab: [0,15,8,4,0,0,0,7,14,0],
          }[key];
          const a = actor.reviewed && actor.family === 'sword' && swordDirection
            ? swordDirection[index] * Math.PI / 180 - Math.atan2(pickTip.y - grip[1], pickTip.x - grip[0])
            : bend * Math.PI / 180;
          const sin = Math.sin(a), cos = Math.cos(a);
          const point = p => {
            const dx = p.x - grip[0], dy = p.y - grip[1];
            return [Math.round(hand[0] + dx * cos - dy * sin), Math.round(hand[1] + dx * sin + dy * cos)];
          };
          if (actor.reviewed && attackPatch.length) {
            const edge = extent(attackPatch.map(p => {
              const [x,y] = point(p);
              return { x, y };
            }));
            hand[0] += Math.max(2 - edge.left, 0) - Math.max(edge.right - (size - 3), 0);
            hand[1] += Math.max(2 - edge.top, 0) - Math.max(edge.bottom - (size - 3), 0);
          }
          let tip = point(pickTip);
          const bodyPoint = p => {
              const leg = cap((p.y - waist) / Math.max(1, body.bottom - waist), 0, 1);
              const forward = p.x >= frame.anchor[0];
              const knee = Math.sin(leg * Math.PI) * (heavy ? 2 : 1);
              const stepX = fixedFeet ? 0 : forward ? frontStep : rearStep;
              const head = 1 - cap((p.y - body.top) / Math.max(1, waist - body.top), 0, 1);
              let tx = step(hip + chestPush * head, stepX + knee, leg);
              let ty = (low + (fixedFeet ? 0 : hip === 0 ? 0 : 1)) * (1 - leg);
              if (actor.reviewed && !actor.anchor && !beast) {
                // 장비 경계가 몸통과 겹친 유닛은 RGB를 잘라내지 않고 전체 상체를 함께 옮긴다.
                tx = step(hip + Math.round(chestPush * .5 + x * .45), stepX + knee, leg);
                ty = (low + Math.round(y * .5)) * (1 - leg);
              }
              if (beast) {
                const muzzle = cap((p.x - bodyCenter) / Math.max(3, body.right - bodyCenter), 0, 1);
                tx += x * muzzle * (1 - leg);
                ty += y * muzzle * (1 - leg);
                if (key === 'bite' && index >= 2 && index <= 4 && p.y > chest) ty += 2 * muzzle;
                if ((key === 'paw' || key === 'rise') && index >= 2 && index <= 4 && forward) ty -= 3 * leg;
              }
              return [Math.round(p.x + tx), Math.round(p.y + ty)];
          };
          const rendered = tile(mark => {
            for (const p of canonical) {
              if (!beast && patch.has(p.y * size + p.x)) continue;
              const [px, py] = bodyPoint(p);
              mark(px, py, p.color);
              if (beast) {
                for (const [dx, dy] of [[1,0],[0,1]]) {
                  const sample = { x:p.x+dx, y:p.y+dy };
                  if (!canonicalInk.has(sample.y * size + sample.x)) continue;
                  const [nx,ny] = bodyPoint(sample);
                  if (Math.abs(nx-px)>1 || Math.abs(ny-py)>1) line(mark, px, py, nx, ny, p.color);
                }
              }
            }
            if (beast) {
              tip = [body.right + Math.round(x * .7 + hip), key === 'bite' ? chest + y : body.bottom - 3 + Math.min(0, y)];
              if (key === 'bite' && index >= 2 && index <= 4) {
                line(mark, tip[0] - 4, tip[1] + 2, tip[0], tip[1] + 1, outline);
              }
              return;
            }
            if (actor.reviewed && !actor.anchor) return;
            // 팔은 어깨와 손 사이에 남고 장비는 손을 축으로 돈다.
            if (bentArm) {
              const [sx, sy] = shoulder;
              const [hx, hy] = hand;
              const ex = Math.round(step(sx, hx, .48));
              const ey = Math.round(step(sy, hy, .48)) + (index === 5 || index === 6 ? 0 : 2);
              line(mark, sx, sy - 1, ex, ey - 1, outline, 5);
              line(mark, sx, sy, ex, ey, artColor, 3);
              line(mark, ex, ey, hx, hy, outline, 4);
              line(mark, ex, ey + 1, hx, hy + 1, artColor, 2);
            } else {
              line(mark, shoulder[0], shoulder[1], hand[0], hand[1], outline, heavy ? 4 : 3);
              line(mark, shoulder[0], shoulder[1] + 1, hand[0], hand[1] + 1, artColor, heavy ? 2 : 1);
            }
            if (attackPatch.length) {
              const edge = extent(attackPatch.map(p => {
                const [x,y]=point(p);return {x,y};
              }));
              for (let py=edge.top-1;py<=edge.bottom+1;py++) for(let px=edge.left-1;px<=edge.right+1;px++) {
                const rx=px-hand[0],ry=py-hand[1];
                const ox=Math.round(grip[0]+rx*cos+ry*sin),oy=Math.round(grip[1]-rx*sin+ry*cos);
                if (ox<0||ox>=size||oy<0||oy>=size) continue;
                const pixel=patch.get(oy*size+ox);
                if(pixel) mark(px,py,pixel);
              }
            }
            if (key === 'punch' || key === 'wrench') tip = [Math.max(tip[0], hand[0] + 2), hand[1] + 1];
            if (key === 'bash' && attackPatch.length) {
              tip = attackPatch.map(point).reduce((a, b) =>
                b[0] - Math.abs(b[1] - hand[1]) * .5 > a[0] - Math.abs(a[1] - hand[1]) * .5 ? b : a);
            }
            if (key === 'bow' && index >= 1 && index <= 7) {
              const bowX = Math.max(tip[0], hand[0] + 3);
              const pull = [0,2,4,7,8,2,0,1,0,0][index];
              const aimY = hand[1];
              const cheek = [bowX - 2 - pull, aimY];
              line(mark, bowX - 3, aimY - 8, cheek[0], cheek[1], highlight);
              line(mark, cheek[0], cheek[1], bowX - 3, aimY + 7, highlight);
              if (index < eventFrame) line(mark, cheek[0] - 1, aimY, bowX + 3, aimY, trim);
              tip = [bowX + 2, aimY];
            }
          });
          return { pixels: rendered, tip, hand, label, effect, event };
        }
        function stamp(pixels, col, row) {
          let count = 0;
          for (const color of pixels) if (color) {
            if (!colors.includes(color)) throw Error('New color: ' + actor.id);
            count++;
          }
          if (count < 80) throw Error('Empty or incomplete frame: ' + actor.id + ' row ' + row + ' column ' + col + ' (' + count + ' pixels)');
          sheet.putImageData(new ImageData(new Uint8ClampedArray(pixels.buffer), size, size), col * size, row * size);
        }
        for (let i = 0; i < clips.idle.durations.length; i++) stamp(i === 0 ? quiet : mirrorGround(i, 0), i, clips.idle.row);
        for (let i = 0; i < clips.walk.durations.length; i++) stamp(move(i), i, clips.walk.row);
        for (let i = 0; i < clips.hit.durations.length; i++) stamp(hurt(i), i, clips.hit.row);
        const attacks = actor.attacks.map((key, index) => {
          const row = [2,4,5][index];
          const [label,effect,event] = actions[key];
          const poses = attackTimes.map((_, i) => poseAttack(key, i));
          const distinct = new Set(poses.map(pose => pose.pixels.join(',')));
          if (distinct.size < 7) throw Error('Attack poses repeated: ' + actor.id + '/' + key);
          poses.forEach((pose, i) => stamp(pose.pixels, i, row));
          const timed = { key, label, effect, event, row, loop: false, durations: attackTimes, eventFrame: event ? eventFrame : undefined };
          if (actor.articulated && /Rally$/.test(key)) timed.echoFrame = 7;
          if (!actor.articulated && actor.reviewed && !actor.anchor && actor.type !== 'beast') return timed;
          const tip = poses.map(pose => pose.tip), hand = poses.map(pose => pose.hand);
          if (clipped(...tip[eventFrame])) throw Error('Event point outside sheet: ' + actor.id + '/' + key);
          return { ...timed, tip, hand };
        });
        return { image: sheet.canvas.toDataURL('image/png').split(',')[1], attacks, groundCenter: frame.anchor[0] };
      }
      return Promise.all(batch.map(async actor => {
        const bitmap = new Image();
        bitmap.src = actor.url;
        await bitmap.decode();
        const source = surface(512, 256);
        source.drawImage(bitmap, 0, 0);
        return bake(actor, source);
      }));
    }, { batch, frame, clips, attackPoses, actions: definitions, attackTimes, eventFrame });
    for (const [index, actor] of batch.entries()) {
      const { image, attacks, groundCenter } = rows[index];
      const bytes = Buffer.from(image, 'base64');
      const sheet = 'png/' + actor.id + '.png';
      await writeFile(new URL(sheet, output), bytes);
      if (pack) await writeFile(new URL(sheet, pack), bytes);
      const review = reviewed ? { equipment: actor.equipment, family: actor.family, separatedGear: Boolean(actor.anchor) } : {};
      if (articulated) review.authoredEquipmentPoints = Boolean(actor.gearPoint || actor.anchor);
      manifest.units.push({ id: actor.id, name: actor.name, type: actor.type, profile: actor.profile, sheet, attacks, groundCenter, ...review, sha256: checksum(bytes) });
    }
  }
  assert.equal(manifest.units.length, 276);
  const text = JSON.stringify(manifest, null, 2) + '\n';
  await writeFile(new URL('manifest.json', output), text);
  if (pack) await writeFile(new URL('manifest.json', pack), text);
  const preview = { frame, clips, effectLabels, units: manifest.units.map(({ sha256, ...unit }) => unit) };
  await writeFile(new URL('preview-data.js', output), 'window.tavernAllyMotionV' + version + ' = ' + JSON.stringify(preview) + ';\n');
  console.log('Exported 276 allies, ' + manifest.units.reduce((n, u) => n + u.attacks.length, 0) + ' attack clips.');
} finally {
  await browser.close();
}
