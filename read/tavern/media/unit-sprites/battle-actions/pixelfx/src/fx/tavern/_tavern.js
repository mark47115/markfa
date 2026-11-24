// Shared by Tavern Heros' battle cue effects. Files starting with _ are helpers.
// Every cue effect is pure, draw(p, t, o), so the battle preview can show any moment of a looping skill.
// The painter is placed at the cue's source; o carries the rest in local px:
//   tx, ty  the target's body centre      fx, fy  the target's feet      h  the target's height
//   len     the cue's length in seconds    dir     1 if the caster faces right, -1 if left
//   shape   the cue's shape name           material  spark bolt sound arrow leaf coin spear seal vial rope shard
// The game's rules (sections/10-vfx.md): stepped dots with a dark rim, the faction's mid tone and a bright core;
// the brightest dots only at the start of a hit and at a skill's working point; danger zones are a red dotted
// floor line with an empty middle; shields open as plates on both sides of the body; slows sit at the feet.

import { hex, mix, toHex, rng, noise, TAU, WHITE } from "../../core/index.js";

const INK = { ally: "#392f3b", void: "#302436" }, LIGHT = { ally: "#fff2ce", void: "#b2eee0" };

/** An 8-step ramp from a unit's colour: the faction's dark rim, shaded steps, the colour, tints, the light. */
export function rampFor(color, enemy = false) {
  const c = hex(color), ink = hex(enemy ? INK.void : INK.ally), light = hex(enemy ? LIGHT.void : LIGHT.ally);
  return [ink, mix(ink, c, 0.35), mix(ink, c, 0.6), mix(ink, c, 0.82), c, mix(c, light, 0.38), mix(c, light, 0.72), light].map(toHex);
}
/** Mending and cleansing keep the game's green whoever casts them. */
export const HEAL = rampFor("#91e4b3", false);
/** The danger line: dark rim, deep red, red, hot red. */
export const WARN = ["#2a0c14", "#7a1a26", "#d23a3a", "#ff8a72"];
/** Anger keeps its orange. */
export const ANGER = rampFor("#ffae70", false);

export const DEFAULTS = { tx: 70, ty: 0, fx: 70, fy: 12, h: 26, len: 0.4, dir: 1, material: "spark", seed: 1 };

/** Cue progress 0..1, or -1 outside the cue (draw nothing then). */
export const progress = (t, o) => (t < 0 || t >= o.len ? -1 : t / o.len);

/** One dot with the game's dark rim under it. */
export function rimDot(p, x, y, c, ink, a = 1) {
  p.dot(x, y + 1, ink, a);
  p.dot(x, y, c, a);
}
/** A 1 px line with the dark rim under and beside it. */
export function rimLine(p, x0, y0, x1, y1, c, ink, a = 1) {
  p.line(x0, y0 + 1, x1, y1 + 1, ink, a);
  p.line(x0 + 1, y0, x1 + 1, y1, ink, a * 0.6);
  p.line(x0, y0, x1, y1, c, a);
}
/** A 2 px line (thick), dark rimmed. */
export function thickLine(p, x0, y0, x1, y1, c, ink, a = 1) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  p.line(x0 - nx, y0 - ny + 1, x1 - nx, y1 - ny + 1, ink, a);
  p.line(x0 + nx, y0 + ny + 1, x1 + nx, y1 + ny + 1, ink, a);
  p.line(x0, y0, x1, y1, c, a);
  p.line(x0 + nx * 0.6, y0 + ny * 0.6, x1 + nx * 0.6, y1 + ny * 0.6, c, a);
}
/** Dots along an ellipse arc round (cx, cy), rx, ry, from a0 to a1; keep(x, y, g) 0..1 thins it. */
export function arcDots(p, cx, cy, rx, ry, a0, a1, c, ink, a = 1, keep = () => 1) {
  const m = Math.max(4, Math.ceil(Math.max(rx, ry) * Math.abs(a1 - a0) * 1.3));
  for (let i = 0; i <= m; i++) {
    const g = a0 + ((a1 - a0) * i) / m, x = cx + Math.cos(g) * rx, y = cy + Math.sin(g) * ry, k = keep(x, y, g);
    if (k <= 0) continue;
    if (ink != null) rimDot(p, x, y, typeof c === "function" ? c(g, i / m) : c, ink, a * k);
    else p.dot(x, y, typeof c === "function" ? c(g, i / m) : c, a * k);
  }
}
/** A dashed ellipse: every other run of `dash` dots, marching with `off`. */
export function dashEllipse(p, cx, cy, rx, ry, c, ink, a = 1, dash = 3, off = 0) {
  const m = Math.max(10, Math.ceil(Math.max(rx, ry) * TAU * 1.1));
  for (let i = 0; i < m; i++) {
    if (Math.floor((i + off) / dash) % 2) continue;
    const g = (i / m) * TAU, x = cx + Math.cos(g) * rx, y = cy + Math.sin(g) * ry;
    if (ink != null) p.dot(x, y + 1, ink, a);
    p.dot(x, y, c, a);
  }
}
/** A dashed straight line with a dark rim. */
export function dashLine(p, x0, y0, x1, y1, c, ink, a = 1, dash = 4, off = 0) {
  const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(L));
  for (let i = 0; i <= n; i++) {
    if (Math.floor((i + off) / dash) % 2) continue;
    const u = i / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u;
    p.dot(x, y + 1, ink, a);
    p.dot(x, y - 1, ink, a * 0.7);
    p.dot(x, y, c, a);
  }
}
/** A star glint: four or six arms, a white heart only while hot. */
export function glint(p, x, y, r, C, hot = true, a = 1) {
  if (r < 0.6) return;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let k = 1; k <= r; k++) p.dot(x + dx * k, y + dy * k, k > r - 1 ? C[4] : C[6], a);
  p.px(x, y, hot ? WHITE : hex(C[6]));
  p.glow(x, y, r * 2 + 2, C[5], 0.35 * a);
}
/** Radial streaks bursting from (x, y): n of them, reaching r at u = 1, seeded. */
export function burst(p, x, y, u, r, n, C, seed, { spread = TAU, dir = 0, a = 1, len = 3 } = {}) {
  const g = rng(seed, 77);
  for (let i = 0; i < n; i++) {
    const ang = dir + (spread >= TAU ? (i / n) * TAU + g.range(-0.3, 0.3) : g.range(-spread / 2, spread / 2)), sp = g.range(0.6, 1);
    const d0 = r * sp * Math.pow(u, 0.6), d1 = Math.max(0, d0 - len * (1 - u) - 1);
    const k = (1 - u) * a;
    if (k <= 0.03) continue;
    p.line(x + Math.cos(ang) * d1, y + Math.sin(ang) * d1, x + Math.cos(ang) * d0, y + Math.sin(ang) * d0, (q) => (q > 0.7 ? C[6] : C[4]), k);
    p.light(x + Math.cos(ang) * d0, y + Math.sin(ang) * d0, C[5], 0.25 * k);
  }
}
/** A water/potion bead, s 1..3, with a tail along its motion. */
export function bead(p, C, x, y, vx, vy, s, a = 1) {
  const sp = Math.hypot(vx, vy) || 1, ux = vx / sp, uy = vy / sp, tail = Math.min(4, sp * 0.01);
  if (tail >= 1) p.line(x - ux * (tail + 1), y - uy * (tail + 1), x - ux, y - uy, (q) => (q < 0.5 ? C[3] : C[4]), a);
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
/** A flat floor ring at (x, y) whose crest breaks up as k falls. */
export function floorRing(p, C, x, y, r, k, seed = 0, sy = 0.36) {
  if (k <= 0.03 || r < 0.6) return;
  const m = Math.max(8, Math.ceil(r * TAU * 1.3));
  for (let i = 0; i < m; i++) {
    const g = (i / m) * TAU;
    if (noise(g * 4.1 + seed * 3.7, seed) < 1.1 - 1.4 * k) continue;
    const near = Math.sin(g) > 0, X = x + Math.cos(g) * r, Y = y + Math.sin(g) * r * sy;
    if (near) p.dot(X, Y + 1, C[0], Math.min(1, k * 1.4));
    p.dot(X, Y, near ? (k > 0.6 ? C[6] : C[5]) : C[4], Math.min(1, k * 1.4));
  }
}
/** The point at k (0..1) on the flight from (0, 0) to (tx, ty) bowing up by bend px. */
export function flight(o, k, bend = 0) {
  return [o.tx * k, o.ty * k - bend * Math.sin(Math.PI * k)];
}

export { WHITE };
