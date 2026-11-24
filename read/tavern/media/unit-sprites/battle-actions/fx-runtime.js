// Draws a skill's cues with the pixelfx effects in ./pixelfx (copied by qa/sync-pixelfx.mjs).
// A cue is [startMs, shape, source, target, lengthMs]; points hold the scene's anchors (body centres, feet,
// heights) exactly as player.js lays them out. Every effect is pure, so any moment of a looping skill can be shown.
import { createFrame, clearFrame, painterFor, composite, hash } from './pixelfx/src/core/index.js';
import { rampFor } from './pixelfx/src/fx/tavern/_tavern.js';
import * as projectile from './pixelfx/src/fx/tavern/projectile.js';
import * as impact from './pixelfx/src/fx/tavern/impact.js';
import * as melee from './pixelfx/src/fx/tavern/melee.js';
import * as tether from './pixelfx/src/fx/tavern/tether.js';
import * as telegraph from './pixelfx/src/fx/tavern/telegraph.js';
import * as floorwave from './pixelfx/src/fx/tavern/floorwave.js';
import * as guard from './pixelfx/src/fx/tavern/guard.js';
import * as support from './pixelfx/src/fx/tavern/support.js';
import * as status from './pixelfx/src/fx/tavern/status.js';
import * as ailment from './pixelfx/src/fx/tavern/ailment.js';
import * as tollWarn from './pixelfx/src/fx/tavern/undertow-toll-warn.js';
import * as tollWave from './pixelfx/src/fx/tavern/undertow-toll-wave.js';
import * as tideSnare from './pixelfx/src/fx/tavern/undertow-snare.js';
import * as bellCharge from './pixelfx/src/fx/tavern/bell-weight-charge.js';
import * as bellShield from './pixelfx/src/fx/tavern/bell-weight-shield.js';

const FAMILY = {
  shot: projectile, spore: projectile, mend: projectile,
  sweep: melee, jaws: melee, claw: melee, bash: melee, slam: melee,
  hit: impact, burst: impact, crosshit: impact, diagonalhit: impact, lance: impact, dust: impact, break: impact,
  hook: tether, beam: tether, sight: tether, pull: tether, chain: tether, link: tether,
  circle: telegraph, widecircle: telegraph, cross: telegraph, diagonal: telegraph, lane: telegraph, line: telegraph, thread: telegraph,
  ring: floorwave, call: floorwave, return: floorwave, mist: floorwave, wave: floorwave,
  shield: guard, brace: guard,
  heal: support, clean: support,
  up: status, weaken: status, anger: status, mark: status, crown: status, note: status, charge: status, speed: status, back: status, push: status,
  snare: ailment, poison: ailment,
};

// The Undertow Bell keeps the effects made for it (its lane runs from the boss to past its target).
const SPECIAL = {
  tide: {
    lane: { mod: tollWarn, len: 1400, place: lanePlace },
    wave: { mod: tollWave, len: 1400, place: lanePlace },
    snare: { mod: tideSnare, len: 650, place: (c) => ({ at: c.foot, o: {} }) },
  },
  bellguard: {
    charge: { mod: bellCharge, len: 1000, place: (c) => ({ at: c.a, o: {} }) },
    shield: { mod: bellShield, len: 3000, place: (c) => ({ at: c.casterFoot, o: { scale: c.scale } }) },
  },
};
function lanePlace(c) {
  const from = c.casterFoot[0] - c.dir * 16, length = Math.abs(from - c.foot[0]) + 46;
  return { at: [from, c.foot[1]], flip: c.dir < 0, o: { length } };
}

/** How long a cue really plays, in ms (the boss's own effects run longer than their cue). */
export function cueLength(event, profile) {
  return SPECIAL[profile]?.[event[1]]?.len ?? event[4];
}

// A few of the boss's effects are simulated (create/update/draw): step them to t at 120 Hz, and start over
// when the loop goes back in time.
const sims = new Map(), STEP = 1 / 120;
function simulated(key, mod, o, t, p) {
  let s = sims.get(key);
  if (!s || t < s.t - 1e-6) sims.set(key, (s = { inst: mod.create(o), t: 0 }));
  while (s.t + STEP <= t) { s.inst.update(STEP); s.t += STEP; }
  s.inst.draw(p);
}

const frames = new Map();
function frameFor(w, h) {
  const key = w + 'x' + h;
  if (!frames.has(key)) frames.set(key, createFrame(w, h));
  return clearFrame(frames.get(key));
}

/**
 * Draws every live cue at `age` (ms since release) onto ctx, over what is already there (or onto a clear
 * canvas when onlyFx). unit: the caster (color, material, enemy). opt: { profile, scale, onlyFx }.
 */
export function drawCues(ctx, cues, age, points, unit, opt = {}) {
  const W = ctx.canvas.width, H = ctx.canvas.height, frame = frameFor(W, H);
  const palette = rampFor(unit.color, unit.enemy), dir = unit.enemy ? -1 : 1;
  let drawn = 0;
  for (const event of cues) {
    const [start, shape, source, target] = event;
    const special = SPECIAL[opt.profile]?.[shape];
    const len = (special?.len ?? event[4]) / 1000, t = (age - start) / 1000;
    if (t < 0 || t >= len) continue;
    const a = points[source], b = points[target];
    if (!a || !b) continue;
    const foot = points.feet[target] || [b[0], b[1] + 12], h = points.heights[target] || 23;
    let mod = special?.mod ?? FAMILY[shape];
    // a thrust at reach is a stab; across the field it is a thrown spear
    if (shape === 'thrust') mod = Math.abs(b[0] - a[0]) > 70 ? projectile : melee;
    if (!mod) continue;
    let at = a, flip = false, extra = {};
    if (special?.place) ({ at, flip = false, o: extra } = special.place({ a, b, foot, casterFoot: points.feet.me, dir, scale: opt.scale ?? 1 }));
    const o = {
      ...mod.meta.options, shape: shape === 'thrust' && mod === projectile ? 'shot' : shape,
      tx: b[0] - at[0], ty: b[1] - at[1], fx: foot[0] - at[0], fy: foot[1] - at[1], h, len, dir,
      material: shape === 'thrust' && mod === projectile ? 'spear' : unit.material,
      seed: hash(start, shape.length, source.charCodeAt(0), target.charCodeAt(0)) % 997,
      ...extra,
    };
    if (!special) o.palette = palette;
    const p = painterFor(frame).place(Math.round(at[0]), Math.round(at[1]), flip);
    if (mod.draw) mod.draw(p, t, o);
    else simulated(`${unit.id}:${start}:${shape}:${target}`, mod, o, t, p);
    drawn++;
  }
  if (!drawn) return 0;
  const img = ctx.getImageData(0, 0, W, H);
  composite(frame, img.data, opt.onlyFx ? null : new Uint32Array(img.data.buffer));
  ctx.putImageData(img, 0, 0);
  return drawn;
}
