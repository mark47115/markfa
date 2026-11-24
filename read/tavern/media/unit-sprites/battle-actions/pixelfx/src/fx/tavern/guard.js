import { fit, seg, ease, noise } from "../../core/index.js";
import { DEFAULTS, rampFor, progress } from "./_tavern.js";

export const meta = {
  name: "Tavern · guard",
  desc: "A shield opens as two plates on both sides of the body, lit on their outer edges with a sheen running down; a brace adds struts and stakes driven into the floor.",
  tags: ["tavern-heros", "shield", "guard", "brace", "cue", "one-shot"],
  size: [80, 72],
  origin: [40, 40],
  duration: 0.65,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { ...DEFAULTS, shape: "shield", tx: 0, ty: -13, fx: 0, fy: 0, h: 26, len: 0.65, palette: rampFor("#d6c27a") },
};

export function draw(p, t, o) {
  const u = progress(t, o);
  if (u < 0) return;
  const C = fit(o.palette, 8), cx = o.tx, cy = o.ty, h = Math.max(18, o.h);
  const open = ease.outBack(seg(u, 0, 0.3)), a = 1 - seg(u, 0.8, 1);
  const px = h * 0.42 + 3, top = -h * 0.58, bot = h * 0.42, bulge = 3;
  for (const side of [-1, 1]) {
    const rows = Math.ceil(bot - top);
    for (let j = 0; j <= rows; j++) {
      const v = j / rows;
      if (Math.abs(v - 0.5) > 0.5 * Math.min(1, open)) continue;
      const y = cy + Math.round(top + j) + 0.5, sn = Math.sin(Math.PI * v), outer = cx + side * (px + bulge * sn), inner = outer - side * (1 + 2 * sn);
      for (let x = Math.min(outer, inner); x <= Math.max(outer, inner); x++) {
        const sheen = Math.sin((y - t * 40) / 3 + noise(x * 0.4 + side, o.seed) * 1.5) > 0.8;
        p.blend(x, y, sheen ? C[5] : C[3], (sheen ? 0.6 : 0.38) * a);
      }
      p.dot(outer + side, y, C[0], 0.9 * a);
      p.dot(outer, y, side < 0 ? (v < 0.5 ? C[6] : C[5]) : v < 0.35 ? C[5] : C[4], a);
      if (j % 2 === 0) p.dot(inner, y, C[4], 0.7 * a);
    }
    if (open >= 0.95) {
      p.dot(cx + side * (px - 1), cy + top - 1, C[6], a);
      p.glow(cx + side * px, cy + top, 3, C[5], 0.3 * a);
    }
  }
  if (o.shape === "brace") {
    // struts across the front and stakes into the floor
    for (const dx of [-5, 0, 5]) {
      const X = cx + dx, y0 = o.fy - 3, k = ease.outQuart(seg(u, 0.1, 0.35));
      p.line(X, y0 - 7 * k, X, y0, C[0], a);
      p.line(X + 1, y0 - 7 * k, X + 1, y0, C[4], a);
      p.dot(X + 1, y0 - 7 * k, C[6], a);
    }
    p.line(cx - 8, o.fy - 6, cx + 8, o.fy - 6, C[5], a * Math.min(1, open));
  }
  if (u < 0.12) p.glow(cx, cy, h * 0.6, C[6], 0.25 * (1 - u / 0.12));
}
