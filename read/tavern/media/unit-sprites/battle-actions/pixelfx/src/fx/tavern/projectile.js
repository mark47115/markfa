import { fit, rng, WHITE } from "../../core/index.js";
import { DEFAULTS, rampFor, HEAL, progress, rimLine, thickLine, glint, bead, flight, arcDots } from "./_tavern.js";

export const meta = {
  name: "Tavern · projectile",
  desc: "Shots, thrown spears, spores and mending beads flying from the hand to the target, drawn by the unit's material with a bright head, a sparse trail and a muzzle flick.",
  tags: ["tavern-heros", "projectile", "shot", "cue", "one-shot"],
  size: [120, 56],
  origin: [16, 34],
  duration: 0.3,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { ...DEFAULTS, shape: "shot", tx: 90, ty: -4, len: 0.3, material: "arrow", palette: rampFor("#e2a85c") },
};

const BEND = { mend: 14, spore: 12, vial: 18 };

export function draw(p, t, o) {
  const u = progress(t, o);
  if (u < 0) return;
  const friendly = o.shape === "mend", C = fit(friendly ? HEAL : o.palette, 8);
  const mat = o.shape === "spore" ? "spore" : friendly ? "mend" : o.material;
  const bend = BEND[o.shape] ?? (mat === "vial" ? BEND.vial : mat === "spear" ? 6 : 0);
  const [x, y] = flight(o, u, bend), [x0, y0] = flight(o, Math.max(0, u - 0.06), bend);
  const vx = x - x0 || o.tx * 0.06, vy = y - y0, L = Math.hypot(vx, vy) || 1, ux = vx / L, uy = vy / L, nx = -uy, ny = ux;
  // the trail: sparse dots behind the head, fading
  const trail = mat === "sound" || mat === "seal" ? 0 : mat === "spark" || mat === "shard" || mat === "mend" ? 5 : 3;
  for (let i = 1; i <= trail; i++) {
    const k = Math.max(0, u - i * 0.035), [qx, qy] = flight(o, k, bend);
    if (i % 2 === 0 && mat !== "spark") continue;
    p.dot(qx, qy, i < 2 ? C[5] : i < 4 ? C[4] : C[3], 1 - i / (trail + 1));
  }
  head(p, C, mat, x, y, ux, uy, nx, ny, t, o);
  // a muzzle flick at the hand
  if (u < 0.22) glint(p, 0, 0, 3 * (1 - u / 0.22) + 1, C, u < 0.1, 1 - u / 0.22);
}

function head(p, C, mat, x, y, ux, uy, nx, ny, t, o) {
  const ink = C[0];
  switch (mat) {
    case "arrow": {
      // a shaft, a bright head, two fletching ticks
      rimLine(p, x - ux * 10, y - uy * 10, x - ux, y - uy, C[4], ink);
      p.dot(x, y, WHITE);
      p.dot(x + ux, y + uy, C[6]);
      p.dot(x - ux + nx, y - uy + ny, C[6]);
      p.dot(x - ux - nx, y - uy - ny, C[6]);
      for (const k of [9, 10]) { p.dot(x - ux * k + nx, y - uy * k + ny, C[5]); p.dot(x - ux * k - nx, y - uy * k - ny, C[5]); }
      p.glow(x, y, 4, C[5], 0.25);
      break;
    }
    case "bolt": {
      // a short heavy bolt: a square bright head
      thickLine(p, x - ux * 6, y - uy * 6, x, y, C[4], ink);
      p.rect(x - 0.5, y - 0.5, 2, 2, C[6]);
      p.px(x + ux, y + uy, WHITE);
      break;
    }
    case "spear": {
      rimLine(p, x - ux * 10, y - uy * 10, x - ux * 2, y - uy * 2, C[3], ink);
      p.tri(x + ux * 2, y + uy * 2, x - ux * 2 + nx * 1.6, y - uy * 2 + ny * 1.6, x - ux * 2 - nx * 1.6, y - uy * 2 - ny * 1.6, C[6]);
      p.px(x + ux, y + uy, WHITE);
      break;
    }
    case "coin": {
      // a spinning coin: its width beats, a glint rides it
      const w = Math.abs(Math.cos(t * 40)) * 1.8 + 0.5;
      p.ellipse(x, y, w + 1, 2.8, ink);
      p.ellipse(x, y, w, 1.9, C[4]);
      if (w > 1.2) p.px(x - 0.5, y - 1, C[6]);
      p.glow(x, y, 4, C[5], 0.3);
      break;
    }
    case "vial": {
      // a little flask tumbling on its arc
      const a = t * 18, ca = Math.cos(a), sa = Math.sin(a);
      const at = (dx, dy) => [x + dx * ca - dy * sa, y + dx * sa + dy * ca];
      p.circle(x, y, 2.2, ink);
      p.circle(x, y, 1.5, C[4]);
      p.dot(...at(-0.6, -0.6), C[6]);
      const [nx2, ny2] = at(0, -2.6);
      p.dot(nx2, ny2, C[2]);
      break;
    }
    case "shard": {
      // a void crystal: a dark-rimmed diamond with a lit core
      const L = 3, W = 1.6;
      p.poly([[x + ux * L, y + uy * L], [x + nx * W, y + ny * W], [x - ux * L, y - uy * L], [x - nx * W, y - ny * W]], ink);
      p.poly([[x + ux * (L - 1), y + uy * (L - 1)], [x + nx * (W - 0.6), y + ny * (W - 0.6)], [x - ux * (L - 1), y - uy * (L - 1)], [x - nx * (W - 0.6), y - ny * (W - 0.6)]], C[4]);
      p.px(x + ux, y + uy, C[7]);
      p.glow(x, y, 6, C[5], 0.35);
      break;
    }
    case "leaf": {
      // a leaf tumbling: a pointed oval that turns
      const a = t * 14, ca = Math.cos(a), sa = Math.sin(a);
      for (let k = -2; k <= 2; k++) {
        const w = 1 - Math.abs(k) / 3;
        p.dot(x + ca * k - sa * w, y + sa * k + ca * w, ink);
        p.dot(x + ca * k, y + sa * k, k === 0 ? C[6] : C[4]);
      }
      break;
    }
    case "sound": {
      // rings of sound: three arcs facing the way it flies
      const ang = Math.atan2(uy, ux);
      for (let i = 0; i < 3; i++) {
        const r = 2 + i * 2.4;
        arcDots(p, x - ux * i * 2.6, y - uy * i * 2.6, r * 0.6, r, ang - 1, ang + 1, i === 0 ? C[6] : C[4], ink, 1 - i * 0.28);
      }
      break;
    }
    case "seal": {
      // a stamped glyph turning: a square frame and its mark
      const a = t * 9, ca = Math.cos(a), sa = Math.sin(a), s = 2.6;
      const pts = [[-s, -s], [s, -s], [s, s], [-s, s], [-s, -s]].map(([dx, dy]) => [x + dx * ca - dy * sa, y + dx * sa + dy * ca]);
      for (let i = 0; i < 4; i++) rimLine(p, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], C[5], ink);
      p.px(x, y, C[7]);
      p.glow(x, y, 6, C[5], 0.3);
      break;
    }
    case "rope": {
      // a grapnel: the line back to the hand and a hook at its head
      rimLine(p, 0, 0, x, y, C[3], ink, 0.85);
      p.dot(x, y, C[6]);
      p.dot(x + nx * 1.5 - ux, y + ny * 1.5 - uy, C[5]);
      p.dot(x - nx * 1.5 - ux, y - ny * 1.5 - uy, C[5]);
      break;
    }
    case "spore": {
      // a soft puff drifting on its arc, flecks shed behind it
      p.disc(x, y, 2.6, C[3], 0.6);
      p.disc(x - 0.5, y - 0.5, 1.5, C[5], 0.8);
      p.px(x - 1, y - 1, C[6]);
      const g = rng(o.seed, 3);
      for (let i = 0; i < 3; i++) p.dot(x - ux * (3 + i * 2) + g.range(-1.5, 1.5), y - uy * (3 + i * 2) + g.range(-1.5, 1.5), C[4], 0.7 - i * 0.2);
      break;
    }
    case "mend": {
      // a mending bead: a green drop with a tiny cross
      bead(p, C, x, y, ux * 200, uy * 200, 3);
      p.dot(x, y - 3, C[6]);
      p.dot(x - 1, y - 3, C[5]);
      p.dot(x + 1, y - 3, C[5]);
      p.glow(x, y, 6, C[5], 0.35);
      break;
    }
    default: {
      // spark: an energy pellet, a white heart in a lit ring, a streak behind
      thickLine(p, x - ux * 7, y - uy * 7, x - ux, y - uy, C[4], ink, 0.9);
      p.circle(x, y, 2.2, ink);
      p.circle(x, y, 1.6, C[5]);
      p.px(x, y, WHITE);
      p.glow(x, y, 8, C[5], 0.5);
    }
  }
}

