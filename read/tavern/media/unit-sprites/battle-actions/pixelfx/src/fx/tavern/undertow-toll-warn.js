import { fit, seg, smooth, ease } from "../../core/index.js";
import { TIDE, WARN, LANE_HB, arcDots } from "./_undertow.js";

export const meta = {
  name: "Undertow toll · warning",
  desc: "역류 종파 예고: a marching red dotted line fences the lane while bell tolls roll down it as paired ripples, leaving the middle clear; the last beat runs hot.",
  tags: ["tavern-heros", "boss", "warning", "telegraph", "lane", "water", "ripple", "one-shot"],
  size: [272, 56],
  origin: [12, 28],
  duration: 1.4,
  loop: false,
  fps: 30,
  bg: "dark",
  options: { palette: TIDE, warn: WARN, length: 248, seed: 3 },
};

const D = meta.duration;
// each toll: when it leaves the bell (the cadence quickens towards the strike)
const TOLLS = [0.02, 0.42, 0.76, 1.04, 1.24];
const SPEED = 230, SY = 0.5;

export function draw(p, t, o) {
  if (t >= D) return;
  const C = fit(o.palette, 8), W = fit(o.warn, 4), L = o.length, HB = LANE_HB;
  const grow = ease.outCubic(seg(t, 0, 0.18)), x1 = 4 + (L - 4) * grow;
  const fade = 1 - seg(t, D - 0.07, D), last = seg(t, D - 0.36, D - 0.1);

  // the lane's floor darkens a little, like water pulled thin over it
  for (let y = -HB + 1.5; y < HB; y++)
    for (let x = 4.5; x < x1; x++) p.blend(x, y, C[1], (0.2 + 0.12 * last) * (1 - smooth(0.82, 1, Math.abs(y) / HB)) * fade);

  // tolls: right-facing arcs of ripples, two crests each, kept off the middle line of the lane
  for (const [i, t0] of TOLLS.entries()) {
    const age = t - t0;
    if (age < 0) continue;
    const r = 6 + age * SPEED;
    if (r > x1 + 6) continue;
    const k = Math.min(1, age / 0.05) * (1 - smooth(L * 0.7, L, r)) * fade, hot = i === TOLLS.length - 1 || last > 0;
    for (const [j, gap] of [[0, 0], [1, 4]]) {
      const rr = r - gap;
      if (rr < 3) continue;
      const lim = Math.min(1.35, Math.asin(Math.min(1, (HB - 3) / (rr * SY))));
      arcDots(p, 0, 0, rr, SY, -lim, lim, j === 0 ? (hot ? C[6] : C[5]) : C[4], C[0], k * (j === 0 ? 1 : 0.7), (x, y) => (x > x1 ? 0 : smooth(2.5, 6, Math.abs(y))));
      if (j === 0) for (const sy of [-1, 1]) p.glow(Math.cos(lim * 0.7) * rr, sy * Math.sin(lim * 0.7) * rr * SY, 5, C[4], 0.14 * k);
    }
    // the bell's strike: a quick seafoam flick at the lane's start
    if (age < 0.08) p.glow(2, 0, 10, C[5], 0.5 * (1 - age / 0.08));
  }

  // the red dotted fence, marching towards the far end; it blinks, then holds hot for the last beat
  const dash = 5, gap = 3, per = dash + gap, off = (t * 40) % per;
  const hot = last > 0 || Math.floor(t * 10) % 2 === 0;
  const red = hot ? W[3] : W[2];
  for (const y of [-HB, HB]) {
    for (let x = 4 - per + off; x < x1; x += per) {
      const a0 = Math.max(4, x), a1 = Math.min(x1, x + dash);
      if (a1 <= a0) continue;
      p.line(a0, y - 1, a1, y - 1, W[0], fade);
      p.line(a0, y + 1, a1, y + 1, W[0], fade);
      p.line(a0, y, a1, y, red, fade);
      if (hot) p.glowLine(a0, y, a1, y, 3, W[2], 0.12 * fade);
    }
  }
  // the two ends, dotted across the lane
  for (const x of [4, x1]) {
    for (let y = -HB + 2; y <= HB - 2; y += 4) {
      p.line(x - 1, y, x - 1, y + 2, W[0], fade);
      p.line(x + 1, y, x + 1, y + 2, W[0], fade);
      p.line(x, y, x, y + 2, red, fade);
    }
  }
  // a faint corner tick so the lane reads at a glance in a crowd
  for (const [x, s] of [[4, 1], [x1, -1]]) for (const y of [-HB, HB]) p.px(x + s, y, W[3]);
}
