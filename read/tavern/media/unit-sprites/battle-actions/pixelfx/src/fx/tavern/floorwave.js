import { fit, rng, ease, TAU } from "../../core/index.js";
import { DEFAULTS, rampFor, progress, floorRing, arcDots } from "./_tavern.js";

export const meta = {
  name: "Tavern · floor wave",
  desc: "Rings that spread from the feet: a ring, a call that rises in chevrons, a wide wave with lit crests, a drifting mist, and motes that rise from the feet on a return.",
  tags: ["tavern-heros", "ring", "wave", "aura", "cue", "one-shot"],
  size: [120, 72],
  origin: [60, 52],
  duration: 0.6,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { ...DEFAULTS, shape: "wave", tx: 0, ty: -13, fx: 0, fy: 0, h: 26, len: 0.6, palette: rampFor("#7fb8e8") },
};

export function draw(p, t, o) {
  const u = progress(t, o);
  if (u < 0) return;
  const C = fit(o.palette, 8), x = o.fx, y = o.fy, s = o.seed;
  switch (o.shape) {
    case "return": {
      // motes rise from the feet to above the head and wink out
      const g = rng(s, 3);
      for (let i = 0; i < 7; i++) {
        const d = g.range(0, 0.4), q = Math.min(1, Math.max(0, (u - d) / 0.6));
        if (q <= 0 || q >= 1) continue;
        const X = x + g.range(-7, 7) + Math.sin(q * 6 + i) * 1.5, Y = y - q * (o.h + 6);
        p.dot(X, Y, q > 0.7 ? C[6] : C[5], 1 - q * 0.6);
        p.dot(X, Y + 1, C[3], 0.6 * (1 - q));
        p.light(X, Y, C[5], 0.3);
      }
      floorRing(p, C, x, y, 6 + u * 4, 1 - u, s);
      return;
    }
    case "mist": {
      // soft mist rolls out from the feet and thins
      const g = rng(s, 5);
      for (let i = 0; i < 7; i++) {
        const ang = (i / 7) * TAU + g.range(-0.3, 0.3), d = 3 + ease.outCubic(u) * g.range(10, 18);
        p.disc(x + Math.cos(ang) * d, y - 2 + Math.sin(ang) * d * 0.35, 3 + u * 3, C[3], 0.42 * (1 - u));
        p.disc(x + Math.cos(ang) * d, y - 3 + Math.sin(ang) * d * 0.35, 1.5 + u * 2, C[5], 0.28 * (1 - u));
      }
      floorRing(p, C, x, y, 4 + ease.outCubic(u) * 20, (1 - u) * 0.7, s);
      return;
    }
    case "call": {
      // a call: two rings at the feet and chevrons climbing over the head
      floorRing(p, C, x, y, 4 + ease.outCubic(u) * 14, 1 - u, s);
      floorRing(p, C, x, y, 2 + ease.outCubic(Math.max(0, u - 0.2)) * 10, (1 - u) * 0.8, s + 1);
      for (let i = 0; i < 2; i++) {
        const q = (u + i * 0.35) % 1, Y = y - o.h - 3 - q * 8, a = Math.sin(Math.PI * q);
        arcDots(p, x, Y + 2, 4, 2.5, Math.PI + 0.4, TAU - 0.4, C[6], C[0], a);
      }
      return;
    }
    case "wave": {
      // a wide wave: two crests, the near halves lit
      for (let i = 0; i < 2; i++) {
        const q = Math.max(0, u - i * 0.18), r = 6 + ease.outCubic(q) * 40;
        floorRing(p, C, x, y, r, (1 - q) * (1 - i * 0.3), s + i, 0.38);
      }
      p.glow(x, y, 20, C[4], 0.18 * (1 - u));
      return;
    }
    default: {
      // ring: one crest spreading from the feet, a fainter one inside it
      const r = 6 + ease.outCubic(u) * 26;
      floorRing(p, C, x, y, r, 1 - u, s);
      floorRing(p, C, x, y, r * 0.65, (1 - u) * 0.6, s + 3);
      p.glow(x, y, 12, C[4], 0.15 * (1 - u));
    }
  }
}
