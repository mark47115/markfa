import { fit, cycle, smooth, TAU, WHITE } from "../../core/index.js";
import { TIDE, rimDot } from "./_undertow.js";

export const meta = {
  name: "Undertow snare",
  desc: "역류 종파 둔화: a dark eddy turns under a soldier's feet, its crests pulling backwards, and two thin strands of water cling to the ankles with beads sliding down them.",
  tags: ["tavern-heros", "status", "slow", "snare", "water", "feet", "loop"],
  size: [56, 32],
  origin: [28, 22],
  duration: 1.2,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: TIDE, seed: 4 },
};

const D = meta.duration, RX = 11, SY = 0.32;

// the eddy: a steady ring round the feet with two bright crests running round it; half -1 the far side
// (behind the legs), 1 the near side
function eddy(p, C, t, half) {
  const ph = (t / D) * TAU, m = Math.ceil(RX * TAU * 1.3);
  for (let i = 0; i < m; i++) {
    const g = (i / m) * TAU, sn = Math.sin(g);
    if ((half > 0) !== (sn > 0)) continue;
    const x = Math.cos(g) * RX, y = sn * RX * SY;
    // distance behind the nearest crest, along the ring (the crests run clockwise on screen: backwards)
    let lag = 9;
    for (let k = 0; k < 2; k++) lag = Math.min(lag, (((g - (-ph + k * Math.PI)) % TAU) + TAU) % TAU);
    const c = lag < 0.25 ? (half > 0 ? C[6] : C[5]) : lag < 0.8 ? C[5] : lag < 1.6 ? C[4] : C[3];
    if (half > 0) rimDot(p, x, y, c, C[0], 1);
    else p.dot(x, y, c, 0.85);
    if (lag < 0.25) p.light(x, y, C[4], 0.35);
  }
  // a dim inner ring
  for (let i = 0; i < 24; i++) {
    const g = (i / 24) * TAU, sn = Math.sin(g);
    if ((half > 0) !== (sn > 0) || i % 3 === 0) continue;
    p.dot(Math.cos(g) * (RX - 5), sn * (RX - 5) * SY, C[3], 0.7);
  }
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8);
  // a dark pool of water under the feet
  for (let y = -4.5; y <= 4.5; y++)
    for (let x = -RX - 1.5; x <= RX + 1.5; x++) {
      const e = Math.hypot(x / (RX + 1), y / ((RX + 1) * SY));
      if (e < 1) p.blend(x, y, C[1], 0.5 * (1 - smooth(0.6, 1, e)));
    }
  eddy(p, C, t, -1);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8);
  eddy(p, C, t, 1);
  // a strand of water clings to each ankle, swaying, a bead sliding down
  const ph = (t / D) * TAU;
  for (const [x0, k] of [[-4, 0], [3, 1.7]]) {
    const pts = [];
    for (let j = 0; j <= 4; j++) pts.push([x0 + Math.sin(ph + k + j * 0.7) * (j / 4), 1 - j]);
    p.polyline(pts, (u) => (u > 0.7 ? C[5] : C[4]), 0.75);
  }
  cycle(t, D, 2, o.seed, 0.6, (age, life, r, i) => {
    const x0 = i % 2 ? 3 : -4, y = -4 + (age / life) * 5, k = Math.sin((Math.PI * age) / life);
    p.px(x0, y, k > 0.7 ? WHITE : C[6]);
    p.glow(x0, y, 3, C[5], 0.2 * k);
  });
  p.glow(0, 0, 13, C[4], 0.14);
}
