import { fit, ease, WHITE } from "../../core/index.js";
import { DEFAULTS, rampFor, HEAL, progress, rimLine, thickLine, dashLine, glint } from "./_tavern.js";

export const meta = {
  name: "Tavern · tether",
  desc: "Lines from the caster to the target: a thrown hook and its rope, a beam, an aiming line with a reticle, a chain that drags, and a bowed mending link with beads running along it.",
  tags: ["tavern-heros", "tether", "beam", "chain", "hook", "cue", "one-shot"],
  size: [128, 64],
  origin: [16, 36],
  duration: 0.5,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { ...DEFAULTS, shape: "chain", tx: 96, ty: -2, len: 0.5, palette: rampFor("#b8c0cc") },
};

const at = (o, k, bend = 0) => [o.tx * k, o.ty * k - bend * Math.sin(Math.PI * k)];

export function draw(p, t, o) {
  const u = progress(t, o);
  if (u < 0) return;
  const link = o.shape === "link", C = fit(link ? HEAL : o.palette, 8), ink = C[0];
  const fade = u > 0.8 ? (1 - u) / 0.2 : 1;
  switch (o.shape) {
    case "hook": {
      // the hook flies out on its rope, bites, then the rope goes taut
      const k = Math.min(1, ease.outCubic(u / 0.55)), [x, y] = at(o, k);
      rimLine(p, 0, 0, x, y, C[3], ink, fade);
      const d = Math.sign(o.tx || 1);
      p.dot(x, y, C[6], fade);
      p.dot(x - d, y - 2, C[5], fade);
      p.dot(x - d, y + 2, C[5], fade);
      p.dot(x - 2 * d, y - 2, C[4], fade);
      if (k >= 1 && u < 0.7) glint(p, x, y, 3, C, u < 0.62);
      return;
    }
    case "beam": {
      // a beam that snaps on: a white core in a lit band, pulses running out along it, then it thins
      const k = Math.min(1, ease.outQuart(u / 0.2));
      const [x, y] = at(o, k);
      thickLine(p, 0, 0, x, y, C[4], ink, fade);
      p.line(0, 0, x, y, u < 0.25 ? WHITE : C[6], fade);
      for (let i = 0; i < 3; i++) {
        const q = (u * 3 + i / 3) % 1, [qx, qy] = at(o, q * k);
        p.dot(qx, qy - 1, C[7], fade);
        p.light(qx, qy, C[5], 0.4 * fade);
      }
      p.glowLine(0, 0, x, y, 4, C[4], 0.25 * fade);
      if (k >= 1) glint(p, x, y, 3, C, u < 0.3, fade);
      return;
    }
    case "sight": {
      // an aiming line drawn out in dashes; a reticle closes on the target
      const k = Math.min(1, u / 0.4), [x, y] = at(o, k);
      dashLine(p, 0, 0, x, y, C[5], ink, fade, 3, -u * 20);
      if (k >= 1) {
        // a reticle closes on the target: four corner brackets and a pip
        const r = 7 - ease.outCubic(Math.min(1, (u - 0.4) / 0.3)) * 3;
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          rimLine(p, o.tx + sx * r, o.ty + sy * r, o.tx + sx * (r - 2), o.ty + sy * r, C[6], ink, fade);
          rimLine(p, o.tx + sx * r, o.ty + sy * r, o.tx + sx * r, o.ty + sy * (r - 2), C[6], ink, fade);
        }
        p.px(o.tx, o.ty, C[7]);
      }
      return;
    }
    case "pull":
    case "chain": {
      // a chain thrown taut: alternate lit and dark links; on a pull, links slide back towards the caster
      const k = Math.min(1, ease.outCubic(u / 0.3)), [x, y] = at(o, k), L = Math.hypot(x, y), n = Math.max(2, Math.floor(L / 3));
      const slide = o.shape === "pull" ? -u * 9 : 0;
      for (let i = 0; i <= n; i++) {
        const q = ((i * 3 + slide) % L + L) % L / L, X = x * q, Y = y * q;
        p.dot(X, Y + 1, ink, fade);
        p.dot(X, Y, i % 2 ? C[5] : C[3], fade);
        if (i % 2) p.dot(X, Y - 1, C[4], fade * 0.7);
      }
      if (k >= 1 && u < 0.45) glint(p, x, y, 3, C, u < 0.36, fade);
      return;
    }
    default: {
      // link: a bowed green tether; beads of light run from the caster to the target
      const k = Math.min(1, ease.outCubic(u / 0.3));
      let px = 0, py = 0;
      for (let i = 1; i <= 24; i++) {
        const q = (i / 24) * k, [x, y] = at(o, q, 14);
        rimLine(p, px, py, x, y, C[4], ink, fade * 0.85);
        px = x; py = y;
      }
      for (let i = 0; i < 3; i++) {
        const q = ((u * 2 + i / 3) % 1) * k, [x, y] = at(o, q, 14);
        p.dot(x, y, C[7], fade);
        p.glow(x, y, 4, C[5], 0.3 * fade);
      }
    }
  }
}
