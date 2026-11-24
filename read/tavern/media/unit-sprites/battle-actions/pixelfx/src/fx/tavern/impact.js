import { fit, rng, ease, TAU, WHITE } from "../../core/index.js";
import { DEFAULTS, rampFor, progress, rimLine, glint, burst, bead, floorRing } from "./_tavern.js";

export const meta = {
  name: "Tavern · impact",
  desc: "Hits on the target: a short white flash, then fragments of the unit's material scatter outwards and fade; bursts, cross and diagonal cuts, lances, dust and broken shields.",
  tags: ["tavern-heros", "impact", "hit", "cue", "one-shot"],
  size: [112, 72],
  origin: [56, 40],
  duration: 0.32,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { ...DEFAULTS, shape: "hit", tx: 0, ty: 0, fx: 0, fy: 13, len: 0.32, material: "spark", palette: rampFor("#76c8d4") },
};

export function draw(p, t, o) {
  const u = progress(t, o);
  if (u < 0) return;
  const C = fit(o.palette, 8), x = o.tx, y = o.ty, fy = o.fy, fx = o.fx, s = o.seed, away = Math.sign(o.tx || o.dir || 1);
  const hot = t < 0.05;
  switch (o.shape) {
    case "burst": {
      // a bigger blast: a flash, a ring on the floor, streaks all round
      if (t < 0.07) glint(p, x, y, 5, C, true);
      burst(p, x, y, u, 15, 10, C, s, { len: 4 });
      floorRing(p, C, fx, fy, 4 + ease.outCubic(u) * 16, 1 - u, s);
      p.glow(x, y, 16, C[4], 0.35 * (1 - u));
      return;
    }
    case "crosshit":
    case "diagonalhit":
    case "lance": {
      // cuts across the target: bright lines that draw in fast and thin out
      const dy = o.shape === "diagonalhit" ? 14 : 0, k = ease.outQuart(Math.min(1, u * 2.4)), a = 1 - Math.max(0, (u - 0.45) / 0.55);
      const L = 30;
      rimLine(p, fx - L * k, fy - 12 - dy * k, fx + L * k, fy - 12 + dy * k, hot ? WHITE : C[6], C[0], a);
      if (o.shape !== "lance") rimLine(p, fx - dy * k * 0.6, fy - 12 + 18 * k, fx + dy * k * 0.6, fy - 12 - 18 * k, C[5], C[0], a);
      if (u < 0.3) glint(p, fx, fy - 12, 3, C, hot);
      return;
    }
    case "dust": {
      // dust kicked up round the feet: soft puffs that swell and thin
      const g = rng(s, 5);
      for (let i = 0; i < 6; i++) {
        const ang = g.range(Math.PI * 0.9, Math.PI * 2.1), d = 4 + ease.outCubic(u) * g.range(8, 14);
        p.disc(fx + Math.cos(ang) * d, fy - 1 + Math.sin(ang) * d * 0.35 - u * 4, 2 + u * 2.5, C[2], 0.55 * (1 - u));
        p.disc(fx + Math.cos(ang) * d - 0.5, fy - 2 + Math.sin(ang) * d * 0.35 - u * 4, 1 + u * 1.5, C[4], 0.4 * (1 - u));
      }
      return;
    }
    case "break": {
      // a shield breaks: two halves of its plate tumble away, splinters with them
      const g = rng(s, 9);
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * TAU + 0.3, d = 5 + ease.outCubic(u) * 13, rx = x + Math.cos(ang) * d, ry = y + Math.sin(ang) * d + u * u * 10;
        const a2 = ang + u * g.range(4, 8);
        rimLine(p, rx, ry, rx + Math.cos(a2) * 3, ry + Math.sin(a2) * 3, i % 2 ? C[6] : C[5], C[0], 1 - u);
      }
      if (t < 0.06) glint(p, x, y, 4, C, true);
      return;
    }
  }
  // a plain hit: a white flick, then the material's fragments
  if (u < 0.28) glint(p, x, y, 5 * (1 - u / 0.28) + 1, C, u < 0.12);
  switch (o.material) {
    case "arrow":
    case "bolt":
    case "spear": {
      // a piercing hit: splinters thrown forward, a short line through
      burst(p, x, y, u, 13, 6, C, s, { spread: 1.6, dir: away > 0 ? 0 : Math.PI, len: 4 });
      if (u < 0.4) rimLine(p, x - away * 3, y, x + away * (4 + u * 6), y, C[6], C[0], 1 - u / 0.4);
      break;
    }
    case "coin": {
      const g = rng(s, 2);
      for (let i = 0; i < 4; i++) {
        const ang = -Math.PI / 2 + g.range(-1.3, 1.3), d = ease.outCubic(u) * g.range(7, 11), cx = x + Math.cos(ang) * d, cy = y + Math.sin(ang) * d + u * u * 12;
        p.dot(cx, cy + 1, C[0], 1 - u);
        p.dot(cx, cy, Math.sin(t * 40 + i) > 0 ? C[6] : C[4], 1 - u);
      }
      break;
    }
    case "leaf": {
      const g = rng(s, 4);
      for (let i = 0; i < 5; i++) {
        const ang = g.range(0, TAU), d = ease.outCubic(u) * g.range(6, 11), cx = x + Math.cos(ang) * d, cy = y + Math.sin(ang) * d + u * 6;
        p.dot(cx, cy, C[5], 1 - u);
        p.dot(cx + Math.cos(t * 20 + i), cy + Math.sin(t * 20 + i), C[3], 1 - u);
      }
      break;
    }
    case "sound": {
      // a pulse of sound: two rings round the target
      for (let i = 0; i < 2; i++) {
        const r = 3 + ease.outCubic(Math.max(0, u - i * 0.15)) * 12;
        floorRing(p, C, x, y, r, (1 - u) * (1 - i * 0.3), s + i, 0.8);
      }
      break;
    }
    case "vial": {
      const g = rng(s, 6);
      for (let i = 0; i < 6; i++) {
        const vx = g.range(-60, 60), vy = g.range(-110, -40), tt = u * o.len;
        bead(p, C, x + vx * tt, y + vy * tt + 300 * tt * tt, vx, vy + 600 * tt, g.chance(0.4) ? 2 : 1, 1 - u * 0.8);
      }
      break;
    }
    case "seal": {
      // a stamp: a square that snaps out and fades
      const r = 3 + ease.outQuart(u) * 6;
      for (const [a0, b0, a1, b1] of [[-r, -r, r, -r], [r, -r, r, r], [r, r, -r, r], [-r, r, -r, -r]]) rimLine(p, x + a0, y + b0, x + a1, y + b1, C[5], C[0], 1 - u);
      break;
    }
    case "shard": {
      // void crystal splinters: dark-rimmed, lit tips
      const g = rng(s, 8);
      for (let i = 0; i < 5; i++) {
        const ang = g.range(0, TAU), d = 2 + ease.outCubic(u) * g.range(7, 12), cx = x + Math.cos(ang) * d, cy = y + Math.sin(ang) * d + u * u * 6;
        rimLine(p, cx, cy, cx + Math.cos(ang) * 2, cy + Math.sin(ang) * 2, C[5], C[0], 1 - u);
        p.px(cx + Math.cos(ang) * 2, cy + Math.sin(ang) * 2, C[6]);
      }
      p.glow(x, y, 9, C[4], 0.3 * (1 - u));
      break;
    }
    case "rope": {
      burst(p, x, y, u, 8, 4, C, s, { len: 4 });
      break;
    }
    default:
      // spark: streaks all round, a tight lit ring
      burst(p, x, y, u, 13, 8, C, s, { len: 4 });
      if (u < 0.5) floorRing(p, C, x, y, 3 + u * 12, 1 - u * 2, s, 0.9);
  }
  p.glow(x, y, 12, C[4], 0.3 * (1 - u));
}
