import { fit, seg, ease, noise, cycle } from "../../core/index.js";
import { TIDE, PLATE, plateAt, drop, floorRing } from "./_undertow.js";

export const meta = {
  name: "Bell weight · shield",
  desc: "수면의 추 보호막: two plates of standing water open on both sides of the boss, a sheen running down them, beads dripping off their feet into rings; they thin out at the end.",
  tags: ["tavern-heros", "boss", "shield", "barrier", "water", "one-shot"],
  size: [168, 120],
  origin: [84, 108],
  duration: 3.0,
  loop: false,
  fps: 30,
  bg: "dark",
  options: { palette: TIDE, scale: 1, seed: 6 },
};

const D = meta.duration, OPEN = 0.26, CLOSE = 0.24;

// one plate: film, sheen, rims; side -1 left, 1 right
export function plate(p, C, t, side, open, a, seed, k = 1) {
  if (open <= 0 || a <= 0) return;
  const reach = ease.outBack(open); // grows from its middle outwards, overshooting a touch
  const v0 = 0.5 - 0.5 * Math.min(1, reach), v1 = 0.5 + 0.5 * Math.min(1, reach);
  const rows = Math.ceil((PLATE.y1 - PLATE.y0) * k);
  for (let j = 0; j <= rows; j++) {
    const v = j / rows;
    if (v < v0 || v > v1) continue;
    const { y, outer, inner } = plateAt(v, side, Math.min(1, reach), k);
    const lo = Math.min(outer, inner), hi = Math.max(outer, inner);
    // the film: see-through teal, with a sheen running down it
    for (let x = Math.floor(lo) + 0.5; x <= hi; x++) {
      const sheen = Math.sin((y - t * 46) / 5 + noise(x * 0.3 + side, seed) * 2) > 0.82;
      p.blend(x, y, sheen ? C[5] : C[3], (sheen ? 0.65 : 0.42) * a);
    }
    // the outer edge: a dark rim outside, a lit edge (lit from the upper left: the left plate's outer edge is brighter)
    const lit = side < 0 ? (v < 0.55 ? C[6] : C[5]) : v < 0.35 ? C[5] : C[4];
    p.dot(outer + side, y, C[0], 0.9 * a);
    p.dot(outer, y, lit, a);
    if (j % 2 === 0) p.dot(inner, y, C[4], 0.8 * a);
    p.light(outer, y, C[4], 0.08 * a);
  }
  // caps: a bright bead at the top, a dark lip at the foot
  if (v0 <= 0.001) {
    const top = plateAt(0, side, 1, k), bot = plateAt(1, side, 1, k);
    p.dot(top.outer - side, top.y - 1, C[6], a);
    p.dot(top.outer, top.y - 1, C[0], a);
    p.dot(bot.outer - side, bot.y + 1, C[0], a);
    p.glow(top.outer - side, top.y, 4, C[5], 0.3 * a);
  }
}

export function draw(p, t, o) {
  if (t >= D) return;
  const C = fit(o.palette, 8);
  const open = seg(t, 0, OPEN), a = 1 - seg(t, D - CLOSE, D);
  for (const side of [-1, 1]) {
    plate(p, C, t, side, open, a, o.seed, o.scale ?? 1);
    const bot = plateAt(1, side, 1, o.scale ?? 1), x = bot.outer - side * 2;
    // beads drip from the foot of the plate into small rings on the floor
    if (open >= 1)
      cycle(t, 0.5, 2, o.seed + (side > 0 ? 7 : 0), 0.5, (age, life, r) => {
        const fall = Math.min(1, age / 0.16), y = bot.y + 2 + (-bot.y - 2) * fall * fall;
        if (age < 0.16) drop(p, C, x + r.range(-2, 2), y, 0, 300, 2, a);
        else floorRing(p, C, x, 0, 1 + (age - 0.16) * 14, (1 - (age - 0.16) / 0.34) * a, r.int(1, 9));
      });
    // a cool pool of light on the floor under each plate
    p.glow(side * PLATE.x * (o.scale ?? 1), 0, 18, C[4], 0.12 * a * open);
  }
  // the opening: a quick seafoam flick down each plate's edge
  if (t < 0.12) for (const side of [-1, 1]) p.glow(side * PLATE.x * (o.scale ?? 1), ((PLATE.y0 + PLATE.y1) / 2) * (o.scale ?? 1), 14, C[6], 0.35 * (1 - t / 0.12));
}
