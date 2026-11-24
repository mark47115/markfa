import { fit, rng, TAU } from "../../core/index.js";
import { DEFAULTS, rampFor, progress, rimDot } from "./_tavern.js";

export const meta = {
  name: "Tavern · ailment",
  desc: "Lasting ills at the feet and on the body: a slowing ring round the feet with bright crests running backwards, and poison bubbles that rise from the body and pop.",
  tags: ["tavern-heros", "slow", "snare", "poison", "status", "cue", "one-shot"],
  size: [64, 64],
  origin: [32, 48],
  duration: 0.65,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { ...DEFAULTS, shape: "snare", tx: 0, ty: -13, fx: 0, fy: 0, h: 26, len: 0.65, palette: rampFor("#8fb0e0") },
};

export function draw(p, t, o) {
  const u = progress(t, o);
  if (u < 0) return;
  const C = fit(o.palette, 8), ink = C[0], fade = u > 0.8 ? (1 - u) / 0.2 : Math.min(1, u * 8);
  if (o.shape === "poison") {
    // bubbles rise off the body, swell and pop
    const g = rng(o.seed, 11);
    for (let i = 0; i < 6; i++) {
      const d = g.range(0, 0.5), q = (u - d) / 0.5;
      if (q <= 0 || q >= 1) continue;
      const X = o.tx + g.range(-7, 7) + Math.sin(q * 7 + i) * 1.2, Y = o.ty + 4 - q * 14, r = 0.8 + q * 1.4;
      if (q > 0.85) { p.dot(X - 1, Y, C[5], fade); p.dot(X + 1, Y, C[5], fade); continue; }
      p.circle(X, Y, r + 0.7, ink, fade);
      p.circle(X, Y, r, C[4], fade);
      p.dot(X - 0.5, Y - 0.5, C[6], fade);
    }
    return;
  }
  // snare: a ring round the feet, two bright crests running round it backwards
  const RX = Math.max(8, o.h * 0.38), SY = 0.33, x = o.fx, y = o.fy, ph = -u * TAU * 1.3;
  const m = Math.ceil(RX * TAU * 1.3);
  for (let i = 0; i < m; i++) {
    const g = (i / m) * TAU, near = Math.sin(g) > 0;
    let lag = 9;
    for (let k = 0; k < 2; k++) lag = Math.min(lag, (((g - (ph + k * Math.PI)) % TAU) + TAU) % TAU);
    const c = lag < 0.3 ? (near ? C[6] : C[5]) : lag < 1 ? C[5] : lag < 1.8 ? C[4] : C[3];
    const X = x + Math.cos(g) * RX, Y = y + Math.sin(g) * RX * SY;
    if (near) rimDot(p, X, Y, c, ink, fade);
    else p.dot(X, Y, c, 0.8 * fade);
  }
}
