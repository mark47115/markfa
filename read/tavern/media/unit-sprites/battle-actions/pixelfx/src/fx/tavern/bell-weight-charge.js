import { Rng, fit, seg, smooth, ease, TAU, WHITE, sparkle } from "../../core/index.js";
import { TIDE, drop } from "./_undertow.js";

export const meta = {
  name: "Bell weight · charge",
  desc: "수면의 추 준비: beads of water are drawn up from below into the raised clapper, a dashed ring tightens round it and the bead at its heart swells until it flashes.",
  tags: ["tavern-heros", "boss", "charge", "gather", "water", "one-shot"],
  size: [88, 104],
  origin: [44, 44],
  duration: 1.0,
  loop: false,
  fps: 30,
  bg: "dark",
  options: { palette: TIDE, seed: 8 },
};

const D = meta.duration, FLASH = 0.9;

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed);
  // beads rise from below and the sides into the clapper, each on its own curve
  const beads = [];
  for (let i = 0; i < 26; i++) {
    const a = Math.PI / 2 + R.range(-1.5, 1.5), r = R.range(22, 40);
    beads.push({ x: Math.cos(a) * r * 0.9, y: Math.sin(a) * r + 8, t0: R.range(0, FLASH - 0.32), dur: R.range(0.24, 0.42), curl: R.range(-14, 14), s: R.chance(0.3) ? 3 : R.chance(0.5) ? 2 : 1 });
  }
  let t = 0;
  return {
    update(dt) { t += dt; },
    draw(p) {
      if (t >= D) return;
      const out = 1 - seg(t, FLASH + 0.04, D);
      for (const b of beads) {
        const u = (t - b.t0) / b.dur;
        if (u < 0 || u >= 1) continue;
        const e = ease.inQuad(u), x = b.x * (1 - e) + Math.sin(u * Math.PI) * b.curl * (1 - e), y = b.y * (1 - e);
        const e2 = ease.inQuad(Math.min(1, u + 0.04)), vx = (b.x * (1 - e2) - b.x * (1 - e)) * 800, vy = (b.y * (1 - e2) - b.y * (1 - e)) * 800;
        drop(p, C, x, y, vx, vy, b.s, Math.min(1, u * 4));
        p.glow(x, y, 3, C[5], 0.15);
      }
      // the ring tightens (the game's charge mark), dashed, rimmed dark
      const k = seg(t, 0.05, FLASH), rx = 15 * (1 - ease.inQuad(k)) + 4, ry = rx * 0.8;
      if (t < FLASH + 0.02) {
        const m = Math.ceil(rx * TAU * 1.2);
        for (let i = 0; i < m; i++) {
          const g = (i / m) * TAU + t * 3;
          if (Math.floor((i / m) * 14) % 2) continue;
          const x = Math.cos(g) * rx, y = Math.sin(g) * ry;
          p.dot(x, y + 1, C[0], 0.9);
          p.dot(x, y, k > 0.8 ? C[6] : C[4], 0.95);
        }
      }
      // the bead at the heart swells, a highlight top left, light on it
      const s = 1 + 3 * ease.outQuad(seg(t, 0.15, FLASH)), wob = Math.sin(t * 30) * 0.3 * (s - 1) / 3;
      if (t < FLASH + 0.06) {
        p.ellipse(0, 0, s + 1 + wob, s + 1 - wob, C[0]);
        p.ellipse(0, 0, s + wob, s - wob, C[3]);
        p.ellipse(-0.3, -0.3, s * 0.7, s * 0.7, C[5]);
        p.px(-Math.round(s * 0.5), -Math.round(s * 0.5), C[7]);
        p.glow(0, 0, 8 + s * 3, C[4], 0.25 * out);
      }
      // the flash: short, then gone
      const f = seg(t, FLASH, FLASH + 0.08);
      if (f > 0 && f < 1) {
        sparkle(p, 0, 0, 7 * (1 - f) + 2, WHITE, C[5], 0.6);
        p.glow(0, 0, 16, C[5], 0.28 * (1 - f));
      }
      p.glow(0, 0, 30, C[3], 0.1 * smooth(0, 0.5, t) * out);
    },
  };
}
