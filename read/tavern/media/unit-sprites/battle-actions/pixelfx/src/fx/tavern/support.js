import { fit, ease, TAU } from "../../core/index.js";
import { DEFAULTS, HEAL, progress, arcDots, floorRing } from "./_tavern.js";

export const meta = {
  name: "Tavern · support",
  desc: "Mending on the target: green crosses rise from the body and wink out, a soft light on it; a cleanse adds a ring that turns round the body and lifts away.",
  tags: ["tavern-heros", "heal", "cleanse", "support", "cue", "one-shot"],
  size: [72, 72],
  origin: [36, 52],
  duration: 0.5,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { ...DEFAULTS, shape: "heal", tx: 0, ty: -13, fx: 0, fy: 0, h: 26, len: 0.5 },
};

function cross(p, C, x, y, a) {
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, 0], [1, 0], [0, -1], [0, 1]]) p.dot(x + dx, y + dy + 1, C[0], a);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) p.dot(x + dx, y + dy, C[5], a);
  p.dot(x, y, C[7], a);
  p.light(x, y, C[5], 0.3 * a);
}

export function draw(p, t, o) {
  const u = progress(t, o);
  if (u < 0) return;
  const C = fit(HEAL, 8), x = o.tx, y = o.ty;
  for (let i = 0; i < 3; i++) {
    const q = (u + i * 0.33) % 1, a = Math.sin(Math.PI * q) * (u > 0.85 ? (1 - u) / 0.15 : 1);
    cross(p, C, x + (i - 1) * 7, y + 4 - q * 16, a);
  }
  p.glow(x, y, 10, C[4], 0.22 * (1 - u));
  if (o.shape === "clean") {
    const r = 11 * (1 - u * 0.4), lift = -u * 6;
    arcDots(p, x, y + lift + 4, r, r * 0.4, u * 6, u * 6 + TAU * 0.72, (g, q) => (q > 0.8 ? C[7] : C[5]), C[0], 1 - u);
    floorRing(p, C, o.fx, o.fy, 4 + ease.outCubic(u) * 8, (1 - u) * 0.7, o.seed);
  }
}
