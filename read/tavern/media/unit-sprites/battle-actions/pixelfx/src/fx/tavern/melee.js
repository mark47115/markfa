import { fit, ease, WHITE } from "../../core/index.js";
import { DEFAULTS, rampFor, progress, rimLine, thickLine, glint, floorRing, burst } from "./_tavern.js";

export const meta = {
  name: "Tavern · melee",
  desc: "Close blows: a swung arc, a thrust that stabs out and draws back, closing jaws, raking claws, a shield bash and a slam into the floor.",
  tags: ["tavern-heros", "melee", "slash", "thrust", "cue", "one-shot"],
  size: [96, 64],
  origin: [24, 40],
  duration: 0.3,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { ...DEFAULTS, shape: "sweep", tx: 40, ty: 0, fx: 40, fy: 13, len: 0.3, palette: rampFor("#c8b4a0") },
};

export function draw(p, t, o) {
  const u = progress(t, o);
  if (u < 0) return;
  const C = fit(o.palette, 8), d = Math.sign(o.tx || o.dir || 1);
  switch (o.shape) {
    case "thrust": {
      // a stab: out fast, a beat at full reach, back slower; a bright tip with a lit shaft behind it
      const reach = Math.min(Math.abs(o.tx), 40) * (u < 0.35 ? ease.outQuart(u / 0.35) : 1 - ease.inQuad((u - 0.35) / 0.65) * 0.8);
      const x1 = d * reach, y1 = o.ty * (reach / Math.max(1, Math.abs(o.tx)));
      thickLine(p, d * 2, 0, x1, y1, C[4], C[0], u < 0.8 ? 1 : (1 - u) * 5);
      p.dot(x1, y1, u < 0.4 ? WHITE : C[6]);
      p.dot(x1 - d, y1, C[6]);
      if (u > 0.25 && u < 0.5) for (let i = 1; i <= 3; i++) p.dot(x1 - d * (3 + i * 3), y1 + (i % 2 ? -2 : 2), C[5], 0.6);
      p.glow(x1, y1, 5, C[5], 0.35 * (1 - u));
      return;
    }
    case "jaws": {
      // two wedges close on the target and bite
      const x = o.tx, y = o.ty, k = ease.inQuad(Math.min(1, u * 1.6)), gap = 9 * (1 - k) + 1, a = 1 - Math.max(0, (u - 0.6) / 0.4);
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
        const X = x + (i - 1) * 4;
        rimLine(p, X - 2, y + s * (gap + 4), X, y + s * gap, C[6], C[0], a);
        rimLine(p, X + 2, y + s * (gap + 4), X, y + s * gap, C[5], C[0], a);
      }
      if (u > 0.6 && u < 0.75) glint(p, x, y, 3, C, true);
      return;
    }
    case "claw": {
      // claws rake the target: three parallel scratches drawn in fast, bright at their heads
      const x = o.tx, y = o.ty, k = ease.outQuart(Math.min(1, u * 2.2)), a = 1 - Math.max(0, (u - 0.5) / 0.5);
      for (let i = -1; i <= 1; i++) {
        const x0 = x - d * 6 + i * 3, y0 = y - 7, x1 = x0 + d * 10 * k, y1 = y0 + 12 * k;
        rimLine(p, x0, y0, x1, y1, i === 0 ? C[6] : C[5], C[0], a);
        if (u < 0.35) p.dot(x1, y1, WHITE, a);
      }
      p.glow(x, y, 7, C[5], 0.3 * a);
      return;
    }
    case "bash": {
      // a shield's front edge strikes: an upright line of impact at the near side of the target, sparks off it
      const x = o.tx - d * 5, y = o.ty, k = ease.outQuart(Math.min(1, u * 3)), a = 1 - u;
      rimLine(p, x, y - 8 * k, x, y + 8 * k, u < 0.2 ? WHITE : C[6], C[0], a);
      rimLine(p, x - d * 2, y - 6 * k, x - d * 2, y + 6 * k, C[4], C[0], a * 0.7);
      burst(p, x, y, u, 9, 5, C, o.seed, { spread: 1.8, dir: d > 0 ? 0 : Math.PI, len: 3 });
      return;
    }
    case "slam": {
      // a heavy blow into the floor: lines driven down, a ring and grit thrown up
      const x = o.fx, y = o.fy, k = ease.outQuart(Math.min(1, u * 2));
      for (const dx of [-3, 0, 3]) rimLine(p, x + dx, y - 20 + k * 8, x + dx * 1.5, y - 4, C[5], C[0], 1 - u);
      floorRing(p, C, x, y, 4 + ease.outCubic(u) * 18, 1 - u, o.seed);
      burst(p, x, y - 2, u, 10, 6, C, o.seed, { spread: 2, dir: -Math.PI / 2, len: 3 });
      if (t < 0.06) glint(p, x, y - 3, 4, C, true);
      return;
    }
  }
  // sweep: an arc swung through the front, its leading edge bright, thinning as it ends
  const r = 9 + 18 * ease.outCubic(u), ry = 9 + 12 * ease.outCubic(u), span = 1.25, a0 = -1.6 + u * 0.7;
  const m = Math.ceil(r * span * 1.6);
  for (let i = 0; i <= m; i++) {
    const q = i / m, g = a0 + q * span, x = d * Math.cos(g) * r, y = Math.sin(g) * ry;
    const lead = q > 0.72, a = Math.min(1, (1.25 - u) * (0.45 + 0.75 * q));
    p.dot(x, y + 1, C[0], a);
    p.dot(x * 1.08, y * 1.08, C[0], a * 0.7);
    p.dot(x, y, lead ? (u < 0.3 ? WHITE : C[6]) : q > 0.4 ? C[5] : C[4], a);
    if (q > 0.35) p.dot(x * 0.9, y * 0.9, q > 0.7 ? C[5] : C[4], a * 0.85);
    if (q > 0.6) p.dot(x * 0.8, y * 0.8, C[3], a * 0.5);
  }
  p.glow(d * Math.cos(a0 + span) * r, Math.sin(a0 + span) * ry, 6, C[5], 0.3 * (1 - u));
}

