import { fit, ease, seg, TAU, WHITE } from "../../core/index.js";
import { DEFAULTS, rampFor, ANGER, progress, rimLine, dashEllipse, arcDots, glint } from "./_tavern.js";

export const meta = {
  name: "Tavern · status",
  desc: "Marks on a unit: boost or weakening chevrons, an anger mark, a closing reticle, a crown, a note, a gathering ring at the hand, and speed or knockback lines.",
  tags: ["tavern-heros", "buff", "debuff", "status", "mark", "cue", "one-shot"],
  size: [72, 72],
  origin: [36, 52],
  duration: 0.65,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { ...DEFAULTS, shape: "up", tx: 0, ty: -13, fx: 0, fy: 0, h: 26, len: 0.65, palette: rampFor("#f0c060") },
};

export function draw(p, t, o) {
  const u = progress(t, o);
  if (u < 0) return;
  const C = fit(o.shape === "anger" ? ANGER : o.palette, 8), ink = C[0];
  const x = o.tx, y = o.ty, top = o.fy - o.h - 5, fade = u > 0.8 ? (1 - u) / 0.2 : Math.min(1, u * 8);
  const away = Math.sign(o.tx || o.dir || 1);
  switch (o.shape) {
    case "up":
    case "weaken": {
      // two chevrons above the head: up and rising for a boost, down and sinking for a weakening
      const s = o.shape === "up" ? -1 : 1, drift = s * u * 6;
      for (const [i, dy] of [[0, -2], [1, 4]]) {
        const Y = top + dy + drift, c = i === 0 ? C[6] : C[5];
        rimLine(p, x - 4, Y - s * 3, x, Y, c, ink, fade);
        rimLine(p, x + 4, Y - s * 3, x, Y, c, ink, fade);
      }
      if (o.shape === "up") p.glow(x, top, 6, C[5], 0.3 * fade);
      return;
    }
    case "anger": {
      // a jagged mark above the head that jolts in
      const j = u < 0.2 ? Math.round(Math.sin(t * 60)) : 0, Y = top - 2;
      const pts = [[-6, 3], [-3, 0], [-5, -4], [1, -1], [5, -6]];
      for (let i = 1; i < pts.length; i++) rimLine(p, x + j + pts[i - 1][0], Y + pts[i - 1][1], x + j + pts[i][0], Y + pts[i][1], i % 2 ? C[5] : C[6], ink, fade);
      return;
    }
    case "mark": {
      // a reticle closes on the body: four corner brackets and a centre pip
      const r = 10 - ease.outCubic(seg(u, 0, 0.4)) * 4;
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        rimLine(p, x + sx * r, y + sy * r, x + sx * (r - 3), y + sy * r, C[6], ink, fade);
        rimLine(p, x + sx * r, y + sy * r, x + sx * r, y + sy * (r - 3), C[6], ink, fade);
      }
      p.dot(x, y, u < 0.45 ? WHITE : C[6], fade);
      return;
    }
    case "crown": {
      // a crown above the head, lit along its points
      const Y = top - 3 - Math.sin(u * TAU) * 1;
      const pts = [[-6, -6], [-4, -1], [0, -6], [4, -1], [6, -6], [5, 1], [-5, 1], [-6, -6]];
      for (let i = 1; i < pts.length; i++) rimLine(p, x + pts[i - 1][0], Y + pts[i - 1][1], x + pts[i][0], Y + pts[i][1], i < 5 ? C[6] : C[5], ink, fade);
      for (const dx of [-6, 0, 6]) p.dot(x + dx, Y - 6, WHITE, fade);
      p.glow(x, Y - 3, 8, C[5], 0.3 * fade);
      return;
    }
    case "note": {
      // a note bobbing up over the head
      const X = x + Math.sin(u * TAU) * 2, Y = top - 2 - u * 6;
      p.ellipse(X, Y, 2, 1.5, ink, fade);
      p.ellipse(X, Y - 0.4, 1.4, 1, C[6], fade);
      rimLine(p, X + 1.5, Y, X + 1.5, Y - 7, C[5], ink, fade);
      rimLine(p, X + 1.5, Y - 7, X + 4.5, Y - 5, C[5], ink, fade);
      return;
    }
    case "charge": {
      // a dashed ring closing on the hand while a bead there swells
      const k = ease.inQuad(u), rx = 14 * (1 - k) + 4, ry = 11 * (1 - k) + 3;
      dashEllipse(p, 0, 0, rx, ry, k > 0.8 ? C[6] : C[4], ink, 0.95, 2, -t * 20);
      const s = 1 + 2 * u;
      p.circle(0, 0, s + 0.8, ink);
      p.circle(0, 0, s, C[5]);
      p.px(0, 0, C[7]);
      p.glow(0, 0, 6 + s * 2, C[4], 0.3);
      return;
    }
    case "speed":
    case "back":
    case "push": {
      // motion lines beside the body: streaks trailing away from where it moves
      const way = o.shape === "speed" ? away : -away;
      for (let i = 0; i < 3; i++) {
        const X = x - way * (6 + i * 3 + u * 7), Y = y - 6 + i * 5;
        rimLine(p, X - way * 6, Y, X, Y, i === 1 ? C[6] : C[5], ink, fade * (1 - i * 0.15));
      }
      return;
    }
  }
  glint(p, x, y, 3, C, u < 0.2, fade);
  arcDots(p, x, y, 6, 6, 0, TAU, C[5], ink, fade);
}
