import { Lights, Rng, fit, seg, smooth, ease, noise, sparkle, WHITE } from "../../core/index.js";
import { TIDE, LANE_HB, arcDots, drop, floorRing } from "./_undertow.js";

export const meta = {
  name: "Undertow toll · wave",
  desc: "역류 종파: the bell tolls and a ridge of dark water runs down the lane, white at the crest and throwing beads, then the lane drains backwards in thin streaks.",
  tags: ["tavern-heros", "boss", "wave", "lane", "water", "tide", "one-shot"],
  size: [328, 84],
  origin: [30, 52],
  duration: 1.4,
  loop: false,
  fps: 30,
  bg: "dark",
  options: { palette: TIDE, length: 248, power: 1, seed: 5 },
};

const D = meta.duration;
export const RUN = 0.46; // the crest reaches the far end of the lane (the hit lands as it passes)
const BACK = 28; // how far behind the crest its slope runs, px

// the crest's x at time t, and its height
const crestX = (t, L) => 6 + (L - 6) * ease.outCubic(seg(t, 0, RUN));
const crestH = (t, k) => 17 * k * ease.outQuad(seg(t, 0, 0.08)) * (t < RUN ? 1 - 0.2 * seg(t, 0, RUN) : 0.8 * (1 - ease.outQuad(seg(t, RUN, RUN + 0.28))));
// a wave's profile at dx px from the crest: a steep face in front, a long slope behind
const profile = (dx) => (dx > 0 ? Math.max(0, 1 - dx / 3) ** 2 : Math.exp(dx / 8) * (1 - 0.35 * smooth(-4, 0, dx)) + 0.35 * smooth(-4, 0, dx));

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), L = o.length, K = o.power, HB = LANE_HB;
  const lights = new Lights(), drops = [], rings = [], streaks = [];
  // the lane drains back towards the bell: thin streaks, born behind the passing crest
  for (let i = 0; i < Math.round(26 * K); i++) {
    const x = R.range(20, L - 10);
    streaks.push({ x, y: R.range(-HB + 3, HB - 3), born: RUN * ease.outCubic(x / L) * 0.9 + R.range(0.12, 0.42), life: R.range(0.35, 0.6), len: R.range(5, 11), v: R.range(90, 170) });
  }
  lights.add(2, -12, 30, C[4], 0.45 * K, 0.25);
  lights.add(2, -14, 8, WHITE, 0.35 * K, 0.06);

  let t = 0, acc = 0, burst = false;
  return {
    update(dt) {
      t += dt;
      lights.update(dt);
      // beads off the crest while it runs
      const xc = crestX(t, L), h = crestH(t, K);
      acc += dt * 46 * K;
      while (acc > 1 && t < RUN + 0.08) {
        acc -= 1;
        const y = R.range(-HB + 3, HB - 3);
        drops.push({ x: xc + R.range(-2, 2), y, h: h * R.range(0.6, 1), vx: R.range(30, 150), vh: R.range(50, 160), s: R.chance(0.25) ? 3 : R.chance(0.5) ? 2 : 1, life: 1 });
      }
      // the crest breaks at the far end: a spray thrown forward and up
      if (!burst && t >= RUN) {
        burst = true;
        lights.add(L, -6, 30, C[5], 0.5 * K, 0.3);
        for (let i = 0; i < 26 * K; i++) drops.push({ x: L + R.range(-3, 3), y: R.range(-HB + 3, HB - 3), h: R.range(6, 12), vx: R.range(10, 70), vh: R.range(90, 200), s: R.chance(0.3) ? 3 : 2, life: 1.1 });
      }
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.vh -= 760 * dt;
        d.vx -= d.vx * 0.9 * dt;
        d.x += d.vx * dt;
        d.h += d.vh * dt;
        if ((d.life -= dt) <= 0 || d.h <= 0) {
          if (d.h <= 0 && d.x < L + 8) rings.push({ x: d.x, y: d.y, age: 0, r: 1 + d.s, seed: i + rings.length });
          drops.splice(i, 1);
        }
      }
      for (let i = rings.length - 1; i >= 0; i--) if ((rings[i].age += dt) > 0.4) rings.splice(i, 1);
    },

    draw(p) {
      if (t >= D) return;
      const xc = crestX(t, L), h = crestH(t, K), wake = 1 - seg(t, RUN + 0.15, 1.15);

      // the toll: right-facing arcs of sound round the bell, fast and gone
      for (const [i, d] of [[0, 0], [1, 0.05], [2, 0.1]].map(([i, d]) => [i, t - d])) {
        if (d < 0 || d > 0.3) continue;
        const r = 8 + d * 150, k = (1 - d / 0.3) * K;
        arcDots(p, 0, -14, r, 0.9, -1.1, 1.1, i === 0 && d < 0.06 ? WHITE : C[5], C[0], k);
      }
      if (t < 0.06) sparkle(p, 2, -14, 6, WHITE, C[5], 0.8);

      // the water left behind the crest: a dark wet film that drains away
      // it drains from the bell end once the crest has passed, soft at both ends and at the lane's sides
      const drain = Math.max(0, (t - RUN - 0.04) * 420);
      if (wake > 0)
        for (let y = -HB + 1.5; y < HB; y++) {
          const edge = 1 - smooth(0.55, 1, Math.abs(y) / HB);
          for (let x = 4.5; x < xc - 8; x++) {
            const a = 0.3 * edge * wake * K * smooth(drain, drain + 36, x) * smooth(4, 24, x) * (0.75 + 0.25 * smooth(xc - 60, xc - 10, x));
            if (a > 0.02) p.blend(x, y, (x + y * 3) % 7 < 1 ? C[3] : C[2], a);
          }
        }
      // backwash: streaks slide back towards the bell
      for (const s of streaks) {
        const a = t - s.born;
        if (a < 0 || a > s.life) continue;
        const x = s.x - a * s.v, k = Math.sin((Math.PI * a) / s.life) * K;
        if (x > xc - 6 || x < 6) continue;
        p.line(x, s.y + 1, x + s.len * 0.7, s.y + 1, C[0], k * 0.7);
        p.line(x, s.y, x + s.len, s.y, (u) => (u < 0.25 ? C[5] : u < 0.6 ? C[4] : C[3]), k);
        p.light(x, s.y, C[4], 0.25 * k);
      }

      // the ridge: far rows first, so near rows of the crest sit over them
      if (h > 0.4) {
        for (let y = -HB + 2; y <= HB - 2; y++) {
          const e = Math.abs(y) / HB, bow = -5 * e * e, wob = noise(y * 0.35 + t * 7, o.seed) * 2.2;
          const x0 = xc + bow + wob, hh = h * (1 - 0.3 * e * e) * (0.85 + 0.3 * noise(y * 0.5 + t * 5, o.seed + 7));
          const near = y >= HB - 2.5;
          for (let dx = -BACK; dx <= 2; dx++) {
            const q = profile(dx), top = y - hh * q;
            if (q < 0.05) continue;
            // the slope behind the crest is glassy: tinted, lit where it faces the light
            const slope = profile(dx + 1) - profile(dx);
            const c = dx >= -1 ? C[6] : slope > 0.06 ? C[5] : slope > 0.02 ? C[4] : C[3];
            p.blend(x0 + dx, top, c, (dx >= -1 ? 0.95 : 0.5) * Math.min(1, q * 2));
            // the water mass under the surface, see-through, so the ridge reads as a body of water
            if (!near && y % 2 === 0) for (let z = top + 1; z < y; z += 2) p.blend(x0 + dx, z, C[3], 0.16 * q);
            if (dx === -1 && y === -HB + 2) p.dot(x0 + dx, top - 1, C[0], 0.85);
            // the near edge shows the wave side on: a dark-rimmed body under the surface
            if (near) {
              p.dot(x0 + dx, top - 1, C[0], 0.85);
              for (let z = top + 1; z < y; z++) p.blend(x0 + dx, z, z < top + 2 ? C[4] : z < top + 4 ? C[3] : C[2], 0.8);
              p.dot(x0 + dx, y + 1, C[0], 0.9);
            }
          }
          // the front face drops steeply: a dark rim in front of the crest
          p.dot(x0 + 3, y - hh * 0.25, C[0], 0.8);
          // foam on the crest: white flecks that flicker
          if (noise(y * 1.7 + t * 23, o.seed + 3) > 0.66 && t < RUN) p.px(x0 - 1, y - hh, WHITE);
          p.light(x0, y - hh, C[5], 0.07);
        }
        p.glow(xc, -4, 24, C[4], 0.18 * K * Math.min(1, h / 8));
        p.glow(xc, -h, 8, C[5], 0.12 * K * Math.min(1, h / 8));
      }

      for (const r of rings) floorRing(p, C, r.x, r.y, r.r + r.age * 10, (1 - r.age / 0.4) * 0.8, r.seed);
      for (const d of drops) {
        drop(p, C, d.x, d.y - d.h, d.vx, -d.vh, d.s, Math.min(1, d.life / 0.2));
        p.glow(d.x, d.y - d.h, 3, C[5], 0.12);
      }
      lights.draw(p);
    },
  };
}
