import { fit, seg, ease } from "../../core/index.js";
import { DEFAULTS, rampFor, WARN, progress, dashEllipse, dashLine } from "./_tavern.js";

export const meta = {
  name: "Tavern · telegraph",
  desc: "Danger zones fixed on the floor: a red dotted circle, cross, diagonal, line or lane with an empty middle, a ring of the caster's colour closing in, the last beat held hot.",
  tags: ["tavern-heros", "telegraph", "warning", "zone", "cue", "one-shot"],
  size: [136, 80],
  origin: [68, 44],
  duration: 1.0,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { ...DEFAULTS, shape: "circle", tx: 0, ty: -12, fx: 0, fy: 0, len: 1.0, palette: rampFor("#e06a4a") },
};

const SEGMENTS = {
  cross: [[[-55, 0], [55, 0]], [[0, -30], [0, 30]]],
  diagonal: [[[-42, -16], [42, 16]], [[-42, 16], [42, -16]]],
  line: [[[-64, 0], [53, 0]]],
  thread: [[[-64, 0], [53, 0]]],
};

export function draw(p, t, o) {
  const u = progress(t, o);
  if (u < 0) return;
  const C = fit(o.palette, 8), W = fit(o.warn ?? WARN, 4), x = o.fx, y = o.fy;
  const grow = ease.outCubic(seg(u, 0, 0.18)), last = u > 0.72, fade = 1 - seg(u, 0.94, 1);
  const red = last || Math.floor(t * 8) % 2 === 0 ? W[3] : W[2];
  const off = -t * 24;
  if (o.shape === "circle" || o.shape === "widecircle") {
    const rx = (o.shape === "widecircle" ? 45 : 31) * grow, ry = rx * 0.4;
    dashEllipse(p, x, y, rx, ry, red, W[0], fade, 3, off);
    // the caster's colour closes in from the edge: when it reaches the middle, it lands
    const k = 1 - 0.75 * u;
    dashEllipse(p, x, y, rx * k, ry * k, C[5], C[0], 0.8 * fade, 2, -off);
    if (last) p.glow(x, y, rx * 0.8, W[2], 0.12 * fade);
    return;
  }
  if (o.shape === "lane") {
    // a lane: a band across the floor through the target, fenced top and bottom
    const L = 58 * grow, HB = 9;
    for (const s of [-1, 1]) dashLine(p, x - L, y + s * HB, x + L, y + s * HB, red, W[0], fade, 4, off);
    for (const s of [-1, 1]) dashLine(p, x + s * L, y - HB, x + s * L, y + HB, red, W[0], fade, 2);
    const k = u;
    dashLine(p, x + L - 2 * L * k, y - HB + 3, x + L - 2 * L * k, y + HB - 3, C[5], C[0], 0.8 * fade, 2);
    return;
  }
  for (const [[ax, ay], [bx, by]] of SEGMENTS[o.shape] ?? SEGMENTS.line) {
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    // each line grows from its middle out, then a lit tick runs along it towards the far end
    const x0 = x + mx + (ax - mx) * grow, y0 = y + my + (ay - my) * grow, x1 = x + mx + (bx - mx) * grow, y1 = y + my + (by - my) * grow;
    dashLine(p, x0, y0, x1, y1, red, W[0], fade, 4, off);
    const q = u, qx = x0 + (x1 - x0) * q, qy = y0 + (y1 - y0) * q;
    p.dot(qx, qy, C[6], fade);
    p.glow(qx, qy, 4, C[5], 0.3 * fade);
  }
}
