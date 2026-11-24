// Shared by Tavern Heros' Undertow Bell (역류의 종지기) effects. Files starting with _ are helpers.
// The game's rules: stepped dots with a dark rim, the faction's mid tone, a bright core; the void reads as ink plum
// and slate with a lit teal core; danger zones are a red dotted floor line with an empty middle; shields open as
// plates on both sides of the body; slows sit at the feet.

import { noise, TAU, WHITE } from "../../core/index.js";

/** Ink plum and slate from the boss sprite, into the boss's teal (#4aae9e) and a seafoam core. */
export const TIDE = ["#140c14", "#2c1c34", "#3c3454", "#3a6670", "#4aae9e", "#86d4c0", "#d2f2e6", "#ffffff"];
/** The game's danger line: dark rim, deep red, red, hot red. */
export const WARN = ["#2a0c14", "#7a1a26", "#d23a3a", "#ff8a72"];

/** A lane on the floor: from the boss end (x 0) to x L, half depth HB on screen. */
export const LANE_HB = 17;

/** Water plates beside the boss body (1x atlas scale: the body is about 80 px wide and 86 px tall). */
export const PLATE = { x: 47, y0: -88, y1: -10, bulge: 7 };

/** A plate's outer and inner edge at v (0 top .. 1 bottom), side -1 left or 1 right. */
export function plateAt(v, side, open = 1, k = 1) {
  const y = Math.round((PLATE.y0 + (PLATE.y1 - PLATE.y0) * v) * k) + 0.5, s = Math.sin(Math.PI * v);
  const outer = (PLATE.x + PLATE.bulge * s * open) * k, thick = (2 + 4 * s) * open * Math.max(0.7, k);
  return { y, outer: side * outer, inner: side * (outer - thick) };
}

/** One dot with the game's dark rim under it. */
export function rimDot(p, x, y, c, ink, a = 1) {
  p.dot(x, y + 1, ink, a);
  p.dot(x, y, c, a);
}

/** A crest of n points along an arc of an ellipse (rx, rx * sy) round (cx, cy), from a0 to a1, rimmed below. */
export function arcDots(p, cx, cy, rx, sy, a0, a1, c, ink, a = 1, keep = () => 1) {
  const m = Math.max(4, Math.ceil(rx * Math.abs(a1 - a0) * 1.3));
  for (let i = 0; i <= m; i++) {
    const g = a0 + ((a1 - a0) * i) / m, x = cx + Math.cos(g) * rx, y = cy + Math.sin(g) * rx * sy, k = keep(x, y, g);
    if (k <= 0) continue;
    rimDot(p, x, y, c, ink, a * k);
  }
}

/** A water bead at (x, y) falling or flying at (vx, vy): size 1..3, highlight up-left. */
export function drop(p, C, x, y, vx, vy, s, a = 1) {
  const sp = Math.hypot(vx, vy) || 1, ux = vx / sp, uy = vy / sp, tail = Math.min(4, sp * 0.01);
  if (tail >= 1) p.line(x - ux * (tail + 1), y - uy * (tail + 1), x - ux, y - uy, (u) => (u < 0.5 ? C[3] : C[4]), a);
  if (s >= 3) {
    p.circle(x, y, 1.6, C[0], a);
    p.circle(x, y, 1.1, C[4], a);
    p.dot(x - 0.6, y - 0.6, C[6], a);
  } else if (s >= 2) {
    p.dot(x, y + 1, C[0], a);
    p.dot(x, y, C[5], a);
    p.dot(x + 1, y, C[4], a);
  } else p.dot(x, y, C[5], a);
}

/** A small floor ring at (x, y) with a crest that breaks up as k falls. */
export function floorRing(p, C, x, y, r, k, seed = 0) {
  if (k <= 0.03 || r < 0.6) return;
  const m = Math.max(8, Math.ceil(r * TAU * 1.3));
  for (let i = 0; i < m; i++) {
    const g = (i / m) * TAU;
    if (noise(g * 4.1 + seed * 3.7, seed) < 1.1 - 1.4 * k) continue;
    const near = Math.sin(g) > 0;
    p.dot(x + Math.cos(g) * r, y + Math.sin(g) * r * 0.32, near ? (k > 0.6 ? C[6] : C[5]) : C[4], Math.min(1, k * 1.4));
  }
}

export { WHITE };
