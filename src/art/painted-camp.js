/**
 * Gemalte Bauten, Deko, Werkzeuge und Figuren.
 * Gleicher Aufbau wie die Naturobjekte: Schatten, Farbflächen, Silhouette,
 * Innenlinien – und beide Fassungen (koloriert / Zeichnung) auf einmal.
 */
import {
  blob, teardrop, smoothClosed, offsetShape, pathFrom,
  inkStroke, inkLine, wash, paintObject, groundShadow,
} from './brush.js';
import { INK as ink, fill, made, dot } from './painted.js';
import { makeRng } from '../core/rng.js';

function quad(a, b, c, d, smooth) {
  return smoothClosed([a, b, c, d], smooth || 4);
}

/* --------------------------------------------------------------- Lagerfeuer */

export function paintCampfire(opts) {
  const o = opts || {};
  const w = 168;
  const h = 140;
  const seed = o.seed || 211;
  const cx = w / 2;
  const baseY = h - 16;
  const stones = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3;
    stones.push(smoothClosed(blob(
      cx + Math.cos(a) * 52, baseY - 8 + Math.sin(a) * 20, 16, 12, seed + i, 0.16, 12
    ), 4));
  }
  const logA = smoothClosed([
    [cx - 42, baseY - 8], [cx - 36, baseY - 22], [cx + 32, baseY - 32],
    [cx + 40, baseY - 24], [cx + 32, baseY - 12], [cx - 36, baseY - 2],
  ], 5);
  const logB = smoothClosed([
    [cx - 38, baseY - 32], [cx - 30, baseY - 40], [cx + 36, baseY - 14],
    [cx + 42, baseY - 4], [cx + 30, baseY - 6], [cx - 32, baseY - 24],
  ], 5);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 3,
    outline: 2.6,
    shadow: function (g) { groundShadow(g, cx, baseY - 4, 62, 18, seed + 40, 0.13); },
    wash: function (g) {
      for (let i = 0; i < stones.length; i++) {
        wash(g, stones[i], ink.rock, { seed: seed + 50 + i, scale: 1.06 });
        wash(g, offsetShape(stones[i], 5, 4, 0.6), ink.rockShade, { seed: seed + 60 + i, alpha: 0.8 });
      }
      wash(g, logA, ink.bark, { seed: seed + 70 });
      wash(g, logB, ink.trunkShade, { seed: seed + 71 });
    },
    shape: function (g) {
      for (let i = 0; i < stones.length; i++) fill(g, stones[i]);
      fill(g, logA);
      fill(g, logB);
    },
    ink: function (g) {
      for (let i = 0; i < stones.length; i++) {
        inkStroke(g, stones[i], { width: 1.7, vary: 0.3, seed: seed + 85 + i, color: ink.line, alpha: 0.5 });
      }
      inkLine(g, cx - 22, baseY - 16, cx + 20, baseY - 26, { width: 1.5, bend: 0.08, seed: seed + 95, alpha: 0.45 });
      // verkohlte Mitte
      g.save();
      g.globalAlpha = 0.35;
      g.fillStyle = '#5b4a3a';
      fill(g, smoothClosed(blob(cx, baseY - 14, 26, 10, seed + 96, 0.2, 14), 5));
      g.restore();
    },
  });
  return made(res, w, h, cx, baseY);
}

/** Flamme, vier Bilder. Sie bleibt auch im unkolorierten Zustand farbig. */
export function paintFlame(frame, seedBase) {
  const w = 96;
  const h = 130;
  const seed = (seedBase || 900) + frame * 13;
  const cx = w / 2;
  const baseY = h - 8;
  const lean = [0, 3, 0, -3][frame];
  const tall = [0, -6, -11, -6][frame];

  const outer = smoothClosed(teardrop(cx + lean * 0.5, baseY - 52 + tall, 28, 50 - tall * 0.4, seed, 0.2), 6);
  const mid = smoothClosed(teardrop(cx + lean, baseY - 40 + tall * 0.7, 18, 34, seed + 1, 0.18), 6);
  const core = smoothClosed(teardrop(cx + lean * 1.3, baseY - 28 + tall * 0.4, 10, 20, seed + 2, 0.16), 6);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 4,
    wash: function (g) {
      wash(g, outer, ink.emberDeep, { seed: seed + 5, alpha: 0.85, scale: 1.06 });
      wash(g, mid, ink.ember, { seed: seed + 6, scale: 1.04 });
      wash(g, core, ink.emberLight, { seed: seed + 7 });
    },
    ink: function (g) {
      inkStroke(g, outer, { width: 2.6, vary: 0.4, seed: seed + 10, color: '#b8532c', alpha: 0.9 });
      inkStroke(g, mid, { width: 1.8, vary: 0.35, seed: seed + 11, color: '#d97a35', alpha: 0.75 });
    },
  });
  // Die Flamme wird bewusst in beiden Fassungen farbig gezeichnet
  return made({ color: res.color, line: res.color }, w, h, cx, baseY);
}

/* ------------------------------------------------------------------ Bauten */

export function paintTent(opts) {
  const o = opts || {};
  const w = 320;
  const h = 256;
  const seed = o.seed || 331;
  const cx = w / 2;
  const baseY = h - 14;
  const peak = 34;

  const body = smoothClosed([
    [cx - 128, baseY], [cx - 96, baseY - 60], [cx - 20, peak + 8],
    [cx, peak], [cx + 20, peak + 8], [cx + 96, baseY - 60], [cx + 128, baseY],
  ], 6);
  const flapL = smoothClosed([[cx - 40, baseY], [cx - 12, peak + 30], [cx - 4, peak + 34], [cx - 16, baseY]], 5);
  const flapR = smoothClosed([[cx + 40, baseY], [cx + 12, peak + 30], [cx + 4, peak + 34], [cx + 16, baseY]], 5);
  const doorway = smoothClosed([[cx - 18, baseY], [cx - 10, peak + 40], [cx + 10, peak + 40], [cx + 18, baseY]], 5);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 4,
    outline: 3.4,
    shadow: function (g) { groundShadow(g, cx, baseY - 3, 132, 20, seed, 0.16); },
    wash: function (g) {
      wash(g, body, '#e3b48c', { seed: seed + 2, scale: 1.03 });
      wash(g, offsetShape(body, 44, 10, 0.72), '#c8916a', { seed: seed + 3, alpha: 0.65 });
      wash(g, offsetShape(body, -50, 6, 0.62), '#f0cba6', { seed: seed + 4, alpha: 0.5 });
      wash(g, doorway, '#5c4436', { seed: seed + 5 });
      wash(g, flapL, '#d9a67e', { seed: seed + 6 });
      wash(g, flapR, '#d9a67e', { seed: seed + 7 });
    },
    shape: function (g) { fill(g, body); },
    ink: function (g) {
      inkStroke(g, doorway, { width: 2.6, vary: 0.3, seed: seed + 12, color: ink.line, alpha: 0.9 });
      inkStroke(g, flapL, { width: 2.4, vary: 0.3, seed: seed + 13, color: ink.line, alpha: 0.8 });
      inkStroke(g, flapR, { width: 2.4, vary: 0.3, seed: seed + 14, color: ink.line, alpha: 0.8 });
      // Nähte
      inkLine(g, cx - 74, baseY - 12, cx - 22, peak + 40, { width: 1.6, bend: 0.04, seed: seed + 20, alpha: 0.4 });
      inkLine(g, cx + 74, baseY - 12, cx + 22, peak + 40, { width: 1.6, bend: -0.04, seed: seed + 21, alpha: 0.4 });
      // Abspannungen
      inkLine(g, cx - 126, baseY - 2, cx - 156, baseY - 26, { width: 1.8, bend: 0.1, seed: seed + 30, color: ink.lineSoft });
      inkLine(g, cx + 126, baseY - 2, cx + 156, baseY - 26, { width: 1.8, bend: -0.1, seed: seed + 31, color: ink.lineSoft });
      // Wimpel
      const flag = smoothClosed([[cx + 2, peak - 26], [cx + 40, peak - 16], [cx + 2, peak - 4]], 5);
      g.fillStyle = ink.berry;
      fill(g, flag);
      inkStroke(g, flag, { width: 2.0, vary: 0.3, seed: seed + 40, color: ink.line });
      inkLine(g, cx, peak + 2, cx, peak - 30, { width: 2.4, bend: 0, seed: seed + 41 });
    },
  });
  return made(res, w, h, cx, baseY);
}

export function paintStall(opts) {
  const o = opts || {};
  const w = 348;
  const h = 252;
  const seed = o.seed || 351;
  const cx = w / 2;
  const baseY = h - 14;

  const counter = quad([cx - 128, baseY - 62], [cx + 128, baseY - 62], [cx + 122, baseY - 6], [cx - 122, baseY - 6]);
  const postL = quad([cx - 130, baseY - 60], [cx - 116, baseY - 60], [cx - 116, 84], [cx - 130, 84]);
  const postR = quad([cx + 116, baseY - 60], [cx + 130, baseY - 60], [cx + 130, 84], [cx + 116, 84]);
  const roof = smoothClosed([
    [cx - 152, 86], [cx - 140, 46], [cx + 140, 46], [cx + 152, 86],
  ], 5);
  // Die Zacken hängen an der Dachkante, sonst schweben sie wie eine Girlande
  const scallops = [];
  for (let i = 0; i < 8; i++) {
    const x = cx - 152 + i * 38 + 19;
    scallops.push(smoothClosed([
      [x - 19, 78], [x + 19, 78], [x + 12, 104], [x, 110], [x - 12, 104],
    ], 6));
  }

  const res = paintObject(w, h, {
    seed: seed,
    blur: 4,
    outline: 3.2,
    shadow: function (g) { groundShadow(g, cx, baseY - 3, 140, 20, seed, 0.16); },
    wash: function (g) {
      wash(g, postL, ink.wood, { seed: seed + 20 });
      wash(g, postR, ink.wood, { seed: seed + 21 });
      wash(g, counter, ink.wood, { seed: seed + 22, scale: 1.03 });
      wash(g, offsetShape(counter, 0, 22, 0.9), ink.woodDark, { seed: seed + 23, alpha: 0.6 });
      wash(g, roof, '#f3ece0', { seed: seed + 24 });
      for (let i = 0; i < scallops.length; i++) {
        wash(g, scallops[i], i % 2 ? '#f5eee2' : ink.berry, { seed: seed + 30 + i });
      }
      // Ware auf der Theke
      dot(g, null, cx - 76, baseY - 74, 15, ink.petalYellow, seed + 60);
      dot(g, null, cx - 40, baseY - 72, 13, ink.leaf, seed + 61);
      dot(g, null, cx + 52, baseY - 74, 14, ink.berry, seed + 62);
      dot(g, null, cx + 84, baseY - 70, 11, ink.petalViolet, seed + 63);
    },
    shape: function (g) {
      fill(g, postL); fill(g, postR); fill(g, counter); fill(g, roof);
      for (let i = 0; i < scallops.length; i++) fill(g, scallops[i]);
    },
    ink: function (g) {
      for (let i = 0; i < scallops.length; i++) {
        inkStroke(g, scallops[i], { width: 1.8, vary: 0.3, seed: seed + 70 + i, color: ink.line, alpha: 0.5 });
      }
      inkLine(g, cx - 150, 78, cx + 150, 78, { width: 2.4, bend: 0.01, seed: seed + 78, alpha: 0.8 });
      inkStroke(g, counter, { width: 2.4, vary: 0.3, seed: seed + 80, color: ink.line, alpha: 0.75 });
      inkLine(g, cx - 118, baseY - 34, cx + 118, baseY - 34, { width: 1.8, bend: 0.02, seed: seed + 81, alpha: 0.45 });
      dot(null, g, cx - 76, baseY - 74, 15, ink.petalYellow, seed + 60);
      dot(null, g, cx - 40, baseY - 72, 13, ink.leaf, seed + 61);
      dot(null, g, cx + 52, baseY - 74, 14, ink.berry, seed + 62);
      dot(null, g, cx + 84, baseY - 70, 11, ink.petalViolet, seed + 63);
    },
  });
  return made(res, w, h, cx, baseY);
}

export function paintWorkbench(opts) {
  const o = opts || {};
  const w = 236;
  const h = 172;
  const seed = o.seed || 371;
  const cx = w / 2;
  const baseY = h - 12;

  const top = quad([cx - 96, baseY - 76], [cx + 96, baseY - 76], [cx + 92, baseY - 54], [cx - 92, baseY - 54]);
  const legL = quad([cx - 84, baseY - 54], [cx - 66, baseY - 54], [cx - 62, baseY - 4], [cx - 80, baseY - 4]);
  const legR = quad([cx + 66, baseY - 54], [cx + 84, baseY - 54], [cx + 80, baseY - 4], [cx + 62, baseY - 4]);
  const vice = quad([cx + 40, baseY - 96], [cx + 76, baseY - 96], [cx + 76, baseY - 76], [cx + 40, baseY - 76]);
  const sawBlade = smoothClosed([[cx - 84, baseY - 82], [cx - 26, baseY - 100], [cx - 20, baseY - 90], [cx - 80, baseY - 76]], 4);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 3.5,
    outline: 3.0,
    shadow: function (g) { groundShadow(g, cx, baseY - 3, 96, 15, seed, 0.15); },
    wash: function (g) {
      wash(g, legL, ink.woodDark, { seed: seed + 2 });
      wash(g, legR, ink.woodDark, { seed: seed + 3 });
      wash(g, top, ink.wood, { seed: seed + 4, scale: 1.03 });
      wash(g, offsetShape(top, 0, 8, 0.94), ink.woodDark, { seed: seed + 5, alpha: 0.55 });
      wash(g, vice, ink.iron, { seed: seed + 6 });
      wash(g, sawBlade, '#dfe4e8', { seed: seed + 7 });
    },
    shape: function (g) { fill(g, legL); fill(g, legR); fill(g, top); fill(g, vice); fill(g, sawBlade); },
    ink: function (g) {
      inkStroke(g, top, { width: 2.4, vary: 0.3, seed: seed + 10, color: ink.line, alpha: 0.7 });
      inkStroke(g, vice, { width: 2.0, vary: 0.3, seed: seed + 11, color: ink.line, alpha: 0.7 });
      inkLine(g, cx - 80, baseY - 66, cx + 80, baseY - 66, { width: 1.5, bend: 0.02, seed: seed + 12, alpha: 0.4 });
      // Sägezähne
      for (let i = 0; i < 8; i++) {
        const t = i / 8;
        const x = cx - 82 + t * 60;
        const y = baseY - 78 - t * 18;
        inkLine(g, x, y, x + 4, y + 5, { width: 1.2, bend: 0, seed: seed + 20 + i, alpha: 0.5 });
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

/* -------------------------------------------------------------------- Deko */

export function paintLantern(opts) {
  const o = opts || {};
  const w = 84;
  const h = 204;
  const seed = o.seed || 391;
  const cx = w / 2;
  const baseY = h - 10;

  const post = quad([cx - 7, baseY - 8], [cx + 7, baseY - 8], [cx + 6, baseY - 118], [cx - 6, baseY - 118]);
  const foot = smoothClosed(blob(cx, baseY - 6, 20, 8, seed + 1, 0.15, 14), 5);
  const box = smoothClosed([
    [cx - 24, baseY - 122], [cx + 24, baseY - 122], [cx + 20, baseY - 172], [cx - 20, baseY - 172],
  ], 5);
  const cap = smoothClosed([[cx - 28, baseY - 172], [cx + 28, baseY - 172], [cx + 14, baseY - 190], [cx - 14, baseY - 190]], 5);
  const glass = smoothClosed([
    [cx - 17, baseY - 128], [cx + 17, baseY - 128], [cx + 14, baseY - 166], [cx - 14, baseY - 166],
  ], 5);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 3,
    outline: 2.6,
    shadow: function (g) { groundShadow(g, cx + 2, baseY - 2, 22, 8, seed, 0.14); },
    wash: function (g) {
      wash(g, foot, ink.ironDark, { seed: seed + 2 });
      wash(g, post, ink.iron, { seed: seed + 3 });
      wash(g, box, ink.ironDark, { seed: seed + 4 });
      wash(g, cap, ink.iron, { seed: seed + 5 });
      wash(g, glass, ink.emberLight, { seed: seed + 6, scale: 1.08 });
      wash(g, offsetShape(glass, 0, 6, 0.6), ink.ember, { seed: seed + 7, alpha: 0.8 });
    },
    shape: function (g) { fill(g, foot); fill(g, post); fill(g, box); fill(g, cap); },
    ink: function (g) {
      inkStroke(g, glass, { width: 2.2, vary: 0.3, seed: seed + 12, color: ink.line, alpha: 0.85 });
      inkLine(g, cx, baseY - 190, cx, baseY - 198, { width: 2.2, bend: 0, seed: seed + 13 });
    },
  });
  return made(res, w, h, cx, baseY);
}

export function paintBench(opts) {
  const o = opts || {};
  const w = 208;
  const h = 132;
  const seed = o.seed || 411;
  const cx = w / 2;
  const baseY = h - 10;

  const seat = quad([cx - 82, baseY - 46], [cx + 82, baseY - 46], [cx + 78, baseY - 30], [cx - 78, baseY - 30]);
  const legL = quad([cx - 72, baseY - 30], [cx - 58, baseY - 30], [cx - 56, baseY - 4], [cx - 70, baseY - 4]);
  const legR = quad([cx + 58, baseY - 30], [cx + 72, baseY - 30], [cx + 70, baseY - 4], [cx + 56, baseY - 4]);
  const backL = quad([cx - 74, baseY - 46], [cx - 62, baseY - 46], [cx - 62, baseY - 100], [cx - 74, baseY - 100]);
  const backR = quad([cx + 62, baseY - 46], [cx + 74, baseY - 46], [cx + 74, baseY - 100], [cx + 62, baseY - 100]);
  const slatA = quad([cx - 74, baseY - 96], [cx + 74, baseY - 96], [cx + 74, baseY - 80], [cx - 74, baseY - 80]);
  const slatB = quad([cx - 74, baseY - 74], [cx + 74, baseY - 74], [cx + 74, baseY - 58], [cx - 74, baseY - 58]);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 3,
    outline: 2.8,
    shadow: function (g) { groundShadow(g, cx, baseY - 3, 86, 13, seed, 0.15); },
    wash: function (g) {
      wash(g, legL, ink.woodDark, { seed: seed + 2 });
      wash(g, legR, ink.woodDark, { seed: seed + 3 });
      wash(g, backL, ink.woodDark, { seed: seed + 4 });
      wash(g, backR, ink.woodDark, { seed: seed + 5 });
      wash(g, slatA, ink.wood, { seed: seed + 6 });
      wash(g, slatB, ink.wood, { seed: seed + 7 });
      wash(g, seat, ink.wood, { seed: seed + 8, scale: 1.03 });
      wash(g, offsetShape(seat, 0, 6, 0.95), ink.woodDark, { seed: seed + 9, alpha: 0.5 });
    },
    shape: function (g) {
      fill(g, legL); fill(g, legR); fill(g, backL); fill(g, backR);
      fill(g, slatA); fill(g, slatB); fill(g, seat);
    },
    ink: function (g) {
      inkStroke(g, slatA, { width: 1.8, vary: 0.3, seed: seed + 12, color: ink.line, alpha: 0.55 });
      inkStroke(g, slatB, { width: 1.8, vary: 0.3, seed: seed + 13, color: ink.line, alpha: 0.55 });
      inkStroke(g, seat, { width: 2.2, vary: 0.3, seed: seed + 14, color: ink.line, alpha: 0.7 });
    },
  });
  return made(res, w, h, cx, baseY);
}

export function paintFence(opts) {
  const o = opts || {};
  const w = 136;
  const h = 130;
  const seed = o.seed || 431;
  const cx = w / 2;
  const baseY = h - 10;

  const postL = smoothClosed([
    [cx - 46, baseY - 4], [cx - 30, baseY - 4], [cx - 30, baseY - 88],
    [cx - 38, baseY - 100], [cx - 46, baseY - 88],
  ], 5);
  const postR = smoothClosed([
    [cx + 30, baseY - 4], [cx + 46, baseY - 4], [cx + 46, baseY - 88],
    [cx + 38, baseY - 100], [cx + 30, baseY - 88],
  ], 5);
  const railA = quad([cx - 56, baseY - 80], [cx + 56, baseY - 80], [cx + 56, baseY - 64], [cx - 56, baseY - 64]);
  const railB = quad([cx - 56, baseY - 50], [cx + 56, baseY - 50], [cx + 56, baseY - 34], [cx - 56, baseY - 34]);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 2.5,
    outline: 2.6,
    shadow: function (g) { groundShadow(g, cx, baseY - 2, 52, 9, seed, 0.14); },
    wash: function (g) {
      wash(g, railA, ink.wood, { seed: seed + 2 });
      wash(g, railB, ink.wood, { seed: seed + 3 });
      wash(g, postL, ink.woodDark, { seed: seed + 4 });
      wash(g, postR, ink.woodDark, { seed: seed + 5 });
    },
    shape: function (g) { fill(g, railA); fill(g, railB); fill(g, postL); fill(g, postR); },
    ink: function (g) {
      inkStroke(g, railA, { width: 1.8, vary: 0.3, seed: seed + 10, color: ink.line, alpha: 0.5 });
      inkStroke(g, railB, { width: 1.8, vary: 0.3, seed: seed + 11, color: ink.line, alpha: 0.5 });
      inkLine(g, cx - 38, baseY - 84, cx - 38, baseY - 10, { width: 1.4, bend: 0.02, seed: seed + 12, alpha: 0.4 });
      inkLine(g, cx + 38, baseY - 84, cx + 38, baseY - 10, { width: 1.4, bend: -0.02, seed: seed + 13, alpha: 0.4 });
    },
  });
  return made(res, w, h, cx, baseY);
}

export function paintFlowerbed(opts) {
  const o = opts || {};
  const w = 176;
  const h = 122;
  const seed = o.seed || 451;
  const cx = w / 2;
  const baseY = h - 10;
  const box = smoothClosed([
    [cx - 70, baseY - 4], [cx + 70, baseY - 4], [cx + 64, baseY - 46], [cx - 64, baseY - 46],
  ], 5);
  const soil = smoothClosed(blob(cx, baseY - 46, 60, 12, seed + 1, 0.14, 16), 5);
  const heads = [
    [cx - 42, baseY - 62, ink.petalPink],
    [cx - 8, baseY - 74, ink.petalYellow],
    [cx + 30, baseY - 64, ink.petalViolet],
    [cx + 56, baseY - 56, ink.petalWhite],
  ];

  const res = paintObject(w, h, {
    seed: seed,
    blur: 3,
    outline: 2.8,
    shadow: function (g) { groundShadow(g, cx, baseY - 2, 74, 12, seed, 0.15); },
    wash: function (g) {
      wash(g, box, ink.wood, { seed: seed + 2, scale: 1.03 });
      wash(g, offsetShape(box, 0, 10, 0.92), ink.woodDark, { seed: seed + 3, alpha: 0.55 });
      wash(g, soil, '#8f6f4e', { seed: seed + 4 });
      for (let i = 0; i < heads.length; i++) {
        dot(g, null, heads[i][0], heads[i][1], 14, heads[i][2], seed + 20 + i);
        dot(g, null, heads[i][0], heads[i][1], 5, ink.petalYellow, seed + 40 + i);
      }
    },
    shape: function (g) { fill(g, box); fill(g, soil); },
    ink: function (g) {
      for (let i = 0; i < heads.length; i++) {
        inkLine(g, heads[i][0], baseY - 46, heads[i][0] + 2, heads[i][1] + 8,
          { width: 1.8, bend: 0.1, seed: seed + 60 + i, color: ink.lineSoft });
        dot(null, g, heads[i][0], heads[i][1], 14, heads[i][2], seed + 20 + i);
      }
      inkLine(g, cx - 62, baseY - 24, cx + 62, baseY - 24, { width: 1.5, bend: 0.02, seed: seed + 70, alpha: 0.4 });
    },
  });
  return made(res, w, h, cx, baseY);
}

export function paintBirdhouse(opts) {
  const o = opts || {};
  const w = 116;
  const h = 216;
  const seed = o.seed || 471;
  const cx = w / 2;
  const baseY = h - 10;
  const post = quad([cx - 9, baseY - 6], [cx + 9, baseY - 6], [cx + 8, baseY - 96], [cx - 8, baseY - 96]);
  const box = smoothClosed([
    [cx - 34, baseY - 96], [cx + 34, baseY - 96], [cx + 32, baseY - 152], [cx - 32, baseY - 152],
  ], 5);
  const roof = smoothClosed([[cx - 44, baseY - 148], [cx, baseY - 190], [cx + 44, baseY - 148]], 5);
  const hole = smoothClosed(blob(cx, baseY - 124, 13, 13, seed + 2, 0.1, 12), 5);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 3,
    outline: 2.8,
    shadow: function (g) { groundShadow(g, cx + 2, baseY - 2, 22, 8, seed, 0.14); },
    wash: function (g) {
      wash(g, post, ink.woodDark, { seed: seed + 3 });
      wash(g, box, ink.wood, { seed: seed + 4, scale: 1.03 });
      wash(g, offsetShape(box, 12, 4, 0.6), ink.woodDark, { seed: seed + 5, alpha: 0.5 });
      wash(g, roof, ink.berry, { seed: seed + 6, scale: 1.04 });
      wash(g, hole, '#4a3a2c', { seed: seed + 7 });
    },
    shape: function (g) { fill(g, post); fill(g, box); fill(g, roof); },
    ink: function (g) {
      inkStroke(g, hole, { width: 2.2, vary: 0.3, seed: seed + 12, color: ink.line });
      inkStroke(g, roof, { width: 2.0, vary: 0.3, seed: seed + 13, color: ink.line, alpha: 0.6 });
      inkLine(g, cx, baseY - 112, cx, baseY - 100, { width: 2.6, bend: 0, seed: seed + 14 });
    },
  });
  return made(res, w, h, cx, baseY);
}

export function paintWindchime(opts) {
  const o = opts || {};
  const w = 104;
  const h = 208;
  const seed = o.seed || 491;
  const cx = w / 2;
  const baseY = h - 10;
  const post = quad([cx - 8, baseY - 6], [cx + 8, baseY - 6], [cx + 7, baseY - 150], [cx - 7, baseY - 150]);
  const arm = quad([cx - 36, baseY - 160], [cx + 36, baseY - 160], [cx + 36, baseY - 148], [cx - 36, baseY - 148]);
  const tubes = [
    { x: cx - 24, top: baseY - 146, len: 52, c: ink.copper },
    { x: cx, top: baseY - 146, len: 68, c: ink.gold },
    { x: cx + 24, top: baseY - 146, len: 44, c: ink.copper },
  ];

  const res = paintObject(w, h, {
    seed: seed,
    blur: 2.5,
    outline: 2.6,
    shadow: function (g) { groundShadow(g, cx + 2, baseY - 2, 20, 8, seed, 0.14); },
    wash: function (g) {
      wash(g, post, ink.wood, { seed: seed + 2 });
      wash(g, arm, ink.woodDark, { seed: seed + 3 });
      for (let i = 0; i < tubes.length; i++) {
        const t = tubes[i];
        wash(g, quad([t.x - 7, t.top], [t.x + 7, t.top], [t.x + 6, t.top + t.len], [t.x - 6, t.top + t.len]),
          t.c, { seed: seed + 10 + i });
      }
    },
    shape: function (g) {
      fill(g, post); fill(g, arm);
      for (let i = 0; i < tubes.length; i++) {
        const t = tubes[i];
        fill(g, quad([t.x - 7, t.top], [t.x + 7, t.top], [t.x + 6, t.top + t.len], [t.x - 6, t.top + t.len]));
      }
    },
    ink: function (g) {
      for (let i = 0; i < tubes.length; i++) {
        const t = tubes[i];
        inkLine(g, t.x, baseY - 152, t.x, t.top, { width: 1.2, bend: 0, seed: seed + 20 + i, alpha: 0.6 });
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

export function paintRug(opts) {
  const o = opts || {};
  const w = 208;
  const h = 132;
  const seed = o.seed || 511;
  const cx = w / 2;
  const cy = h - 44;
  const outer = smoothClosed(blob(cx, cy, 92, 44, seed, 0.07, 22), 6);
  const mid = smoothClosed(blob(cx, cy, 68, 32, seed + 1, 0.07, 20), 6);
  const inner = smoothClosed(blob(cx, cy, 38, 18, seed + 2, 0.08, 18), 6);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 3,
    outline: 2.6,
    wash: function (g) {
      wash(g, outer, '#c48091', { seed: seed + 3, scale: 1.03 });
      wash(g, mid, '#e2b39a', { seed: seed + 4 });
      wash(g, inner, '#8fa9b8', { seed: seed + 5 });
    },
    shape: function (g) { fill(g, outer); },
    ink: function (g) {
      inkStroke(g, mid, { width: 2.0, vary: 0.3, seed: seed + 10, color: ink.line, alpha: 0.6 });
      inkStroke(g, inner, { width: 1.8, vary: 0.3, seed: seed + 11, color: ink.line, alpha: 0.55 });
      // Fransen
      const rng = makeRng(seed + 20);
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const x = cx + Math.cos(a) * 92;
        const y = cy + Math.sin(a) * 44;
        inkLine(g, x, y, x + Math.cos(a) * 9, y + Math.sin(a) * 6,
          { width: 1.3, bend: 0.1, seed: seed + 30 + i, alpha: 0.5 });
      }
    },
  });
  return made(res, w, h, cx, h - 8);
}

export function paintSignpost(opts) {
  const o = opts || {};
  const w = 124;
  const h = 176;
  const seed = o.seed || 531;
  const cx = w / 2;
  const baseY = h - 10;
  const post = quad([cx - 9, baseY - 6], [cx + 9, baseY - 6], [cx + 8, baseY - 116], [cx - 8, baseY - 116]);
  const board = smoothClosed([
    [cx - 48, baseY - 96], [cx + 44, baseY - 102], [cx + 46, baseY - 136], [cx - 46, baseY - 130],
  ], 5);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 3,
    outline: 2.8,
    shadow: function (g) { groundShadow(g, cx + 2, baseY - 2, 20, 8, seed, 0.14); },
    wash: function (g) {
      wash(g, post, ink.woodDark, { seed: seed + 2 });
      wash(g, board, ink.wood, { seed: seed + 3, scale: 1.03 });
      wash(g, offsetShape(board, 0, 10, 0.9), ink.woodDark, { seed: seed + 4, alpha: 0.45 });
    },
    shape: function (g) { fill(g, post); fill(g, board); },
    ink: function (g) {
      inkLine(g, cx - 34, baseY - 118, cx + 26, baseY - 122, { width: 2.0, bend: 0.02, seed: seed + 10, alpha: 0.55 });
      inkLine(g, cx - 34, baseY - 106, cx + 6, baseY - 108, { width: 1.8, bend: 0.02, seed: seed + 11, alpha: 0.45 });
    },
  });
  return made(res, w, h, cx, baseY);
}

export function paintCrate(opts) {
  const o = opts || {};
  const w = 136;
  const h = 128;
  const seed = o.seed || 551;
  const cx = w / 2;
  const baseY = h - 10;
  const body = smoothClosed([
    [cx - 52, baseY - 4], [cx + 52, baseY - 4], [cx + 48, baseY - 92], [cx - 48, baseY - 92],
  ], 5);
  const res = paintObject(w, h, {
    seed: seed,
    blur: 3,
    outline: 2.8,
    shadow: function (g) { groundShadow(g, cx + 2, baseY - 2, 54, 11, seed, 0.15); },
    wash: function (g) {
      wash(g, body, ink.wood, { seed: seed + 2, scale: 1.03 });
      wash(g, offsetShape(body, 18, 6, 0.62), ink.woodDark, { seed: seed + 3, alpha: 0.55 });
    },
    shape: function (g) { fill(g, body); },
    ink: function (g) {
      inkLine(g, cx - 44, baseY - 86, cx + 44, baseY - 12, { width: 2.0, bend: 0.03, seed: seed + 10, alpha: 0.55 });
      inkLine(g, cx + 44, baseY - 86, cx - 44, baseY - 12, { width: 2.0, bend: -0.03, seed: seed + 11, alpha: 0.55 });
      inkLine(g, cx - 48, baseY - 76, cx + 48, baseY - 78, { width: 1.6, bend: 0.02, seed: seed + 12, alpha: 0.4 });
    },
  });
  return made(res, w, h, cx, baseY);
}

export function paintChest(opts) {
  const o = opts || {};
  const w = 152;
  const h = 128;
  const seed = o.seed || 571;
  const cx = w / 2;
  const baseY = h - 10;
  const box = smoothClosed([
    [cx - 58, baseY - 4], [cx + 58, baseY - 4], [cx + 54, baseY - 56], [cx - 54, baseY - 56],
  ], 5);
  const lid = smoothClosed([
    [cx - 58, baseY - 54], [cx - 44, baseY - 92], [cx + 44, baseY - 92], [cx + 58, baseY - 54],
  ], 6);
  const lock = quad([cx - 10, baseY - 62], [cx + 10, baseY - 62], [cx + 10, baseY - 40], [cx - 10, baseY - 40]);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 3,
    outline: 3.0,
    shadow: function (g) { groundShadow(g, cx + 2, baseY - 2, 60, 12, seed, 0.15); },
    wash: function (g) {
      wash(g, box, ink.wood, { seed: seed + 2, scale: 1.03 });
      wash(g, offsetShape(box, 16, 6, 0.6), ink.woodDark, { seed: seed + 3, alpha: 0.55 });
      wash(g, lid, ink.bark, { seed: seed + 4, scale: 1.03 });
      wash(g, lock, ink.gold, { seed: seed + 5 });
    },
    shape: function (g) { fill(g, box); fill(g, lid); },
    ink: function (g) {
      inkStroke(g, lock, { width: 2.0, vary: 0.3, seed: seed + 10, color: ink.line, alpha: 0.85 });
      inkLine(g, cx - 54, baseY - 54, cx + 54, baseY - 54, { width: 2.0, bend: 0.02, seed: seed + 11, alpha: 0.6 });
      inkLine(g, cx - 30, baseY - 88, cx - 26, baseY - 8, { width: 1.5, bend: 0.02, seed: seed + 12, alpha: 0.4 });
      inkLine(g, cx + 30, baseY - 88, cx + 26, baseY - 8, { width: 1.5, bend: -0.02, seed: seed + 13, alpha: 0.4 });
    },
  });
  return made(res, w, h, cx, baseY);
}

/* -------------------------------------------------- Erinnerungsstücke ----- */

const MEMORY_PAINTERS = {
  locket: function (g, gi, cx, cy, seed) {
    const body = smoothClosed(blob(cx, cy + 6, 26, 26, seed, 0.08, 16), 5);
    const bail = quad([cx - 6, cy - 26], [cx + 6, cy - 26], [cx + 5, cy - 14], [cx - 5, cy - 14]);
    if (g) {
      wash(g, body, ink.gold, { seed: seed + 1, scale: 1.05 });
      wash(g, offsetShape(body, 0, 0, 0.55), '#f6e2a0', { seed: seed + 2 });
      wash(g, bail, ink.gold, { seed: seed + 3 });
    }
    if (gi) {
      inkStroke(gi, offsetShape(body, 0, 0, 0.56), { width: 1.8, vary: 0.3, seed: seed + 5, color: ink.line, alpha: 0.7 });
    }
    return [body, bail];
  },
  compass: function (g, gi, cx, cy, seed) {
    const body = smoothClosed(blob(cx, cy, 30, 30, seed, 0.06, 18), 5);
    const face = smoothClosed(blob(cx, cy, 21, 21, seed + 1, 0.05, 16), 5);
    if (g) {
      wash(g, body, ink.copper, { seed: seed + 2, scale: 1.05 });
      wash(g, face, '#f4ecd8', { seed: seed + 3 });
    }
    if (gi) {
      inkStroke(gi, face, { width: 2.0, vary: 0.3, seed: seed + 5, color: ink.line, alpha: 0.8 });
      inkLine(gi, cx - 11, cy + 11, cx + 11, cy - 11, { width: 2.4, bend: 0, seed: seed + 6, color: '#c0503f' });
      dot(null, gi, cx, cy, 4, ink.line, seed + 7);
    }
    return [body];
  },
  music: function (g, gi, cx, cy, seed) {
    const box = smoothClosed([[cx - 28, cy + 22], [cx + 28, cy + 22], [cx + 26, cy - 8], [cx - 26, cy - 8]], 5);
    const lid = smoothClosed([[cx - 26, cy - 8], [cx + 26, cy - 8], [cx + 22, cy - 22], [cx - 22, cy - 22]], 5);
    if (g) {
      wash(g, box, '#a9769b', { seed: seed + 1, scale: 1.04 });
      wash(g, lid, ink.wood, { seed: seed + 2 });
    }
    if (gi) {
      inkLine(gi, cx - 24, cy - 8, cx + 24, cy - 8, { width: 1.8, bend: 0.02, seed: seed + 5, alpha: 0.7 });
      inkLine(gi, cx + 14, cy - 22, cx + 16, cy - 40, { width: 2.0, bend: 0.1, seed: seed + 6 });
      dot(null, gi, cx + 10, cy - 42, 5, ink.gold, seed + 7);
    }
    return [box, lid];
  },
  photo: function (g, gi, cx, cy, seed) {
    const paper = smoothClosed([[cx - 26, cy + 26], [cx + 26, cy + 26], [cx + 26, cy - 26], [cx - 26, cy - 26]], 5);
    const pic = smoothClosed([[cx - 20, cy + 12], [cx + 20, cy + 12], [cx + 20, cy - 20], [cx - 20, cy - 20]], 5);
    if (g) {
      wash(g, paper, '#f6f0e2', { seed: seed + 1, scale: 1.04 });
      wash(g, pic, '#93bacb', { seed: seed + 2 });
      wash(g, smoothClosed([[cx - 20, cy + 12], [cx - 2, cy - 10], [cx + 16, cy + 12]], 5), ink.leafDark, { seed: seed + 3 });
    }
    if (gi) {
      inkStroke(gi, pic, { width: 1.8, vary: 0.3, seed: seed + 5, color: ink.line, alpha: 0.75 });
      dot(null, gi, cx + 12, cy - 12, 5, ink.petalYellow, seed + 6);
    }
    return [paper];
  },
  ribbon: function (g, gi, cx, cy, seed) {
    const left = smoothClosed([[cx, cy], [cx - 30, cy - 16], [cx - 30, cy + 16]], 5);
    const right = smoothClosed([[cx, cy], [cx + 30, cy - 16], [cx + 30, cy + 16]], 5);
    const knot = smoothClosed(blob(cx, cy, 9, 9, seed, 0.1, 12), 5);
    if (g) {
      wash(g, left, ink.petalPink, { seed: seed + 1 });
      wash(g, right, ink.petalPink, { seed: seed + 2 });
      wash(g, knot, '#e0879a', { seed: seed + 3 });
    }
    if (gi) {
      inkLine(gi, cx - 4, cy + 6, cx - 14, cy + 30, { width: 2.0, bend: 0.2, seed: seed + 5 });
      inkLine(gi, cx + 4, cy + 6, cx + 14, cy + 30, { width: 2.0, bend: -0.2, seed: seed + 6 });
    }
    return [left, right, knot];
  },
  teacup: function (g, gi, cx, cy, seed) {
    const cup = smoothClosed([[cx - 22, cy - 12], [cx + 22, cy - 12], [cx + 15, cy + 22], [cx - 15, cy + 22]], 5);
    const saucer = smoothClosed(blob(cx, cy + 24, 30, 8, seed + 1, 0.1, 14), 5);
    if (g) {
      wash(g, cup, '#f6f1e6', { seed: seed + 2, scale: 1.04 });
      wash(g, saucer, '#e8e0cf', { seed: seed + 3 });
      wash(g, smoothClosed(blob(cx, cy - 12, 21, 6, seed + 4, 0.1, 14), 5), '#b8d9dd', { seed: seed + 5 });
    }
    if (gi) {
      inkLine(gi, cx + 22, cy - 6, cx + 32, cy + 2, { width: 2.2, bend: 0.35, seed: seed + 6 });
      inkLine(gi, cx + 32, cy + 2, cx + 22, cy + 12, { width: 2.2, bend: 0.35, seed: seed + 7 });
    }
    return [cup, saucer];
  },
};

export function paintMemory(kind, opts) {
  const o = opts || {};
  const w = 100;
  const h = 100;
  const seed = o.seed || 601;
  const cx = w / 2;
  const cy = h / 2 - 4;
  const painter = MEMORY_PAINTERS[kind] || MEMORY_PAINTERS.locket;

  const res = paintObject(w, h, {
    seed: seed,
    blur: 2.5,
    outline: 2.6,
    wash: function (g) { painter(g, null, cx, cy, seed); },
    shape: function (g) {
      const shapes = painter(null, null, cx, cy, seed);
      for (let i = 0; i < shapes.length; i++) fill(g, shapes[i]);
    },
    ink: function (g) { painter(null, g, cx, cy, seed); },
  });
  return made(res, w, h, cx, h - 10);
}

/* ------------------------------------------------------------- Werkzeuge -- */

export function paintTool(kind, opts) {
  const o = opts || {};
  const w = 108;
  const h = 108;
  const seed = o.seed || 651;
  const cx = w / 2;
  const cy = h / 2;

  const parts = { shapes: [], washes: [], inks: [] };

  function handle(x0, y0, x1, y1, thick) {
    return smoothClosed([
      [x0 - thick, y0], [x0 + thick, y0], [x1 + thick, y1], [x1 - thick, y1],
    ], 4);
  }

  let shafts = [];
  let heads = [];
  let headColor = ink.iron;

  if (kind === 'axe') {
    shafts = [handle(cx - 22, cy + 44, cx + 4, cy - 30, 7)];
    heads = [smoothClosed([[cx - 2, cy - 40], [cx + 40, cy - 48], [cx + 44, cy - 16], [cx + 2, cy - 12]], 5)];
  } else if (kind === 'pickaxe') {
    shafts = [handle(cx - 8, cy + 46, cx + 2, cy - 26, 7)];
    heads = [smoothClosed([
      [cx - 46, cy - 18], [cx - 6, cy - 42], [cx + 42, cy - 20],
      [cx + 40, cy - 8], [cx - 4, cy - 30], [cx - 44, cy - 6],
    ], 6)];
  } else if (kind === 'shovel') {
    shafts = [handle(cx - 4, cy + 16, cx + 2, cy - 44, 7)];
    heads = [smoothClosed([
      [cx - 22, cy + 12], [cx + 22, cy + 12], [cx + 16, cy + 44], [cx - 16, cy + 44],
    ], 5)];
  } else if (kind === 'rod') {
    shafts = [handle(cx - 34, cy + 44, cx + 30, cy - 42, 5)];
    heads = [];
    headColor = ink.wood;
  } else { // hand
    heads = [smoothClosed(blob(cx, cy + 4, 26, 30, seed, 0.14, 16), 5)];
    headColor = ink.skin;
  }

  const res = paintObject(w, h, {
    seed: seed,
    blur: 2.5,
    outline: 2.6,
    wash: function (g) {
      for (let i = 0; i < shafts.length; i++) wash(g, shafts[i], ink.wood, { seed: seed + 10 + i, scale: 1.04 });
      for (let i = 0; i < heads.length; i++) {
        wash(g, heads[i], headColor, { seed: seed + 20 + i, scale: 1.05 });
        wash(g, offsetShape(heads[i], 6, 5, 0.6), kind === 'hand' ? ink.skinShade : ink.ironDark,
          { seed: seed + 30 + i, alpha: 0.6 });
      }
    },
    shape: function (g) {
      for (let i = 0; i < shafts.length; i++) fill(g, shafts[i]);
      for (let i = 0; i < heads.length; i++) fill(g, heads[i]);
    },
    ink: function (g) {
      if (kind === 'rod') {
        inkLine(g, cx + 30, cy - 42, cx + 38, cy + 20, { width: 1.4, bend: 0.12, seed: seed + 40, alpha: 0.8 });
        dot(null, g, cx + 38, cy + 22, 5, ink.petalWhite, seed + 41);
      }
      if (kind === 'hand') {
        for (let i = 0; i < 3; i++) {
          inkLine(g, cx - 12 + i * 12, cy - 22, cx - 11 + i * 12, cy - 6,
            { width: 1.5, bend: 0.06, seed: seed + 50 + i, alpha: 0.55 });
        }
      }
    },
  });
  return made(res, w, h, cx, h - 8);
}

/* ------------------------------------------------------------- Kleintiere -- */

export function paintButterfly(frame, opts) {
  const o = opts || {};
  const w = 64;
  const h = 60;
  const seed = (o.seed || 701) + frame * 7;
  const cx = w / 2;
  const cy = h / 2;
  const spread = frame === 0 ? 1 : 0.42;
  const wingL = smoothClosed(blob(cx - 15 * spread, cy - 4, 15 * spread, 17, seed, 0.14, 14), 5);
  const wingR = smoothClosed(blob(cx + 15 * spread, cy - 4, 15 * spread, 17, seed + 1, 0.14, 14), 5);
  const body = smoothClosed(blob(cx, cy, 4, 15, seed + 2, 0.08, 12), 5);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 2,
    outline: 2.0,
    wash: function (g) {
      wash(g, wingL, o.color || ink.warm, { seed: seed + 5 });
      wash(g, wingR, o.color || ink.warm, { seed: seed + 6 });
      wash(g, body, '#5b4a38', { seed: seed + 7 });
    },
    shape: function (g) { fill(g, wingL); fill(g, wingR); fill(g, body); },
    ink: function (g) {
      inkLine(g, cx - 2, cy - 14, cx - 8, cy - 24, { width: 1.3, bend: 0.2, seed: seed + 10 });
      inkLine(g, cx + 2, cy - 14, cx + 8, cy - 24, { width: 1.3, bend: -0.2, seed: seed + 11 });
    },
  });
  return made(res, w, h, cx, cy);
}

export function paintBird(frame, opts) {
  const o = opts || {};
  const w = 84;
  const h = 66;
  const seed = (o.seed || 731) + frame * 9;
  const cx = w / 2;
  const cy = h / 2 + 4;
  const body = smoothClosed(blob(cx - 2, cy, 22, 15, seed, 0.1, 16), 5);
  const head = smoothClosed(blob(cx + 18, cy - 12, 12, 11, seed + 1, 0.1, 14), 5);
  const wing = frame === 0
    ? smoothClosed(blob(cx - 6, cy - 4, 16, 8, seed + 2, 0.14, 14), 5)
    : smoothClosed(blob(cx - 6, cy - 18, 12, 12, seed + 2, 0.14, 14), 5);
  const tail = smoothClosed([[cx - 20, cy - 4], [cx - 40, cy - 14], [cx - 36, cy + 4]], 5);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 2,
    outline: 2.2,
    wash: function (g) {
      wash(g, tail, '#8fa9b8', { seed: seed + 5 });
      wash(g, body, o.color || '#a3bccb', { seed: seed + 6, scale: 1.04 });
      wash(g, head, o.color || '#b4cbd8', { seed: seed + 7 });
      wash(g, wing, '#7f9aab', { seed: seed + 8 });
    },
    shape: function (g) { fill(g, tail); fill(g, body); fill(g, head); },
    ink: function (g) {
      inkStroke(g, wing, { width: 1.8, vary: 0.3, seed: seed + 10, color: ink.line, alpha: 0.7 });
      g.fillStyle = ink.line;
      fill(g, smoothClosed(blob(cx + 22, cy - 14, 2.6, 3, seed + 11, 0.08, 8), 4));
      g.fillStyle = ink.warm;
      fill(g, smoothClosed([[cx + 29, cy - 12], [cx + 40, cy - 9], [cx + 29, cy - 6]], 4));
    },
  });
  return made(res, w, h, cx, h - 6);
}

/* ---------------------------------------------------------------- Figuren -- */

/**
 * Spielfigur.
 * @param {'down'|'up'|'side'} dir
 * @param {number} frame 0 = Stand, 1/2 = Schritt
 */
export function paintScout(dir, frame, opts) {
  const o = opts || {};
  const w = 124;
  const h = 168;
  const seed = (o.seed || 301) + frame * 5;
  const cx = w / 2;
  const baseY = h - 10;
  const headY = 58;
  const bob = frame === 0 ? 0 : -3;
  const stepA = frame === 1 ? 6 : 0;
  const stepB = frame === 2 ? 6 : 0;
  const side = dir === 'side';

  const legL = smoothClosed([
    [cx - 17 - stepA * 0.4, baseY - 30 + bob], [cx - 19 - stepA * 0.6, baseY - 4],
    [cx - 5 - stepA * 0.6, baseY - 3], [cx - 5, baseY - 30 + bob],
  ], 4);
  const legR = smoothClosed([
    [cx + 5, baseY - 30 + bob], [cx + 5 + stepB * 0.6, baseY - 3],
    [cx + 19 + stepB * 0.6, baseY - 4], [cx + 17 + stepB * 0.4, baseY - 30 + bob],
  ], 4);
  const body = smoothClosed(blob(cx, baseY - 46 + bob, side ? 22 : 27, 24, seed + 1, 0.06, 16), 5);
  const armL = smoothClosed(blob(cx - (side ? 20 : 28), baseY - 48 + bob + stepB, 9, 17, seed + 2, 0.08, 12), 5);
  const armR = smoothClosed(blob(cx + (side ? 20 : 28), baseY - 48 + bob + stepA, 9, 17, seed + 3, 0.08, 12), 5);
  const head = smoothClosed(blob(cx, headY + bob, 33, 31, seed + 4, 0.045, 20), 6);
  const brim = smoothClosed(blob(cx, headY - 21 + bob, 45, 13, seed + 5, 0.07, 18), 6);
  const crown = smoothClosed(blob(cx, headY - 34 + bob, 23, 16, seed + 6, 0.07, 14), 5);
  const pack = smoothClosed(blob(cx, baseY - 48 + bob, 25, 22, seed + 7, 0.08, 16), 5);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 2.5,
    outline: 2.9,
    shadow: function (g) { groundShadow(g, cx, baseY - 2, 32, 10, seed + 8, 0.17); },
    wash: function (g) {
      wash(g, legL, ink.boot, { seed: seed + 10 });
      wash(g, legR, ink.boot, { seed: seed + 11 });
      wash(g, armL, ink.cloth, { seed: seed + 14 });
      wash(g, armR, ink.cloth, { seed: seed + 15 });
      if (dir === 'up') {
        wash(g, body, ink.cloth, { seed: seed + 12, scale: 1.05 });
        wash(g, pack, '#c08f5c', { seed: seed + 13, scale: 1.03 });
        wash(g, offsetShape(pack, 8, 6, 0.6), '#a2744a', { seed: seed + 16, alpha: 0.6 });
      } else {
        wash(g, body, ink.cloth, { seed: seed + 12, scale: 1.05 });
        wash(g, offsetShape(body, 10, 7, 0.6), ink.clothDark, { seed: seed + 13, alpha: 0.7 });
      }
      wash(g, head, ink.skin, { seed: seed + 16, scale: 1.05 });
      wash(g, offsetShape(head, 12, 8, 0.58), ink.skinShade, { seed: seed + 17, alpha: 0.45 });
      wash(g, brim, ink.hat, { seed: seed + 18, scale: 1.05 });
      wash(g, crown, ink.hat, { seed: seed + 19 });
      wash(g, offsetShape(crown, 6, 4, 0.7), '#cf8b38', { seed: seed + 21, alpha: 0.6 });
    },
    shape: function (g) {
      fill(g, legL); fill(g, legR);
      fill(g, armL); fill(g, armR);
      fill(g, body);
      if (dir === 'up') fill(g, pack);
      fill(g, head); fill(g, crown); fill(g, brim);
    },
    ink: function (g) {
      inkStroke(g, brim, { width: 2.3, vary: 0.35, seed: seed + 50, color: ink.line, alpha: 0.9 });
      inkLine(g, cx - 5, baseY - 22 + bob, cx - 5, baseY - 4, { width: 1.8, bend: 0, seed: seed + 51, alpha: 0.65 });
      if (dir === 'up') {
        inkStroke(g, pack, { width: 2.2, vary: 0.3, seed: seed + 52, color: ink.line, alpha: 0.8 });
        inkLine(g, cx, baseY - 62 + bob, cx, baseY - 36 + bob, { width: 1.6, bend: 0, seed: seed + 53, alpha: 0.5 });
        return;
      }
      // Gesicht
      g.fillStyle = ink.line;
      const ex = side ? 9 : 0;
      fill(g, smoothClosed(blob(cx - 11 + ex, headY + 4 + bob, 3.8, 4.8, seed + 40, 0.08, 10), 4));
      if (!side) fill(g, smoothClosed(blob(cx + 11, headY + 4 + bob, 3.8, 4.8, seed + 41, 0.08, 10), 4));
      else fill(g, smoothClosed(blob(cx + 19, headY + 4 + bob, 3.4, 4.4, seed + 41, 0.08, 10), 4));
      inkLine(g, cx - 5 + ex, headY + 16 + bob, cx + 5 + ex, headY + 16 + bob,
        { width: 1.8, bend: 0.4, seed: seed + 42 });
      g.globalAlpha = 0.35;
      g.fillStyle = '#e79a92';
      fill(g, smoothClosed(blob(cx - 20 + ex, headY + 11 + bob, 6.5, 4.5, seed + 43, 0.1, 10), 4));
      if (!side) fill(g, smoothClosed(blob(cx + 20, headY + 11 + bob, 6.5, 4.5, seed + 44, 0.1, 10), 4));
      g.globalAlpha = 1;
    },
  });
  return made(res, w, h, cx, baseY);
}

/**
 * Geist. Ohren und Zubehör machen die sechs Figuren unterscheidbar.
 * @param {object} look fur, furShade, accent, ears, hat
 */
export function paintSpirit(look, frame, opts) {
  const o = opts || {};
  const w = 152;
  const h = 190;
  const seed = (o.seed || 401) + frame * 11;
  const cx = w / 2;
  const baseY = h - 12;
  const headY = 68;
  const bob = frame === 1 ? -4 : 0;
  const fur = look.fur;
  const furShade = look.furShade;
  const accent = look.accent;

  const tailPts = [];
  const tailTop = baseY - 62 + bob;
  tailPts.push([cx - 38, tailTop]);
  for (let i = 0; i <= 6; i++) {
    tailPts.push([cx - 38 + (i / 6) * 76, baseY - 6 - (i % 2 === 0 ? 0 : 18)]);
  }
  tailPts.push([cx + 38, tailTop]);
  const tail = smoothClosed(tailPts, 5);

  const body = smoothClosed(blob(cx, baseY - 72 + bob, 43, 36, seed + 1, 0.07, 18), 6);
  const head = smoothClosed(blob(cx, headY + bob, 43, 39, seed + 2, 0.05, 20), 6);
  const muzzle = smoothClosed(blob(cx, headY + 19 + bob, 20, 14, seed + 5, 0.07, 14), 5);

  let ears = [];
  if (look.ears === 'long') {
    ears = [
      smoothClosed(blob(cx - 26, headY - 44 + bob, 10, 26, seed + 3, 0.1, 14), 5),
      smoothClosed(blob(cx + 26, headY - 44 + bob, 10, 26, seed + 4, 0.1, 14), 5),
    ];
  } else if (look.ears === 'pointed') {
    ears = [
      smoothClosed([[cx - 44, headY - 12 + bob], [cx - 30, headY - 56 + bob], [cx - 14, headY - 18 + bob]], 5),
      smoothClosed([[cx + 14, headY - 18 + bob], [cx + 30, headY - 56 + bob], [cx + 44, headY - 12 + bob]], 5),
    ];
  } else {
    ears = [
      smoothClosed(blob(cx - 35, headY - 31 + bob, 14, 14, seed + 3, 0.09, 14), 5),
      smoothClosed(blob(cx + 35, headY - 31 + bob, 14, 14, seed + 4, 0.09, 14), 5),
    ];
  }

  const res = paintObject(w, h, {
    seed: seed,
    blur: 3,
    outline: 3.1,
    wash: function (g) {
      wash(g, tail, fur, { seed: seed + 10, alpha: 0.68 });
      wash(g, body, fur, { seed: seed + 11, scale: 1.05 });
      wash(g, offsetShape(body, 15, 9, 0.6), furShade, { seed: seed + 12, alpha: 0.55 });
      for (let i = 0; i < ears.length; i++) wash(g, ears[i], furShade, { seed: seed + 13 + i });
      wash(g, head, fur, { seed: seed + 15, scale: 1.05 });
      wash(g, offsetShape(head, 15, 10, 0.58), furShade, { seed: seed + 16, alpha: 0.42 });
      wash(g, muzzle, '#faf4e6', { seed: seed + 17 });

      if (look.hat === 'scarf') {
        wash(g, smoothClosed([
          [cx - 37, baseY - 98 + bob], [cx + 37, baseY - 100 + bob],
          [cx + 33, baseY - 82 + bob], [cx - 33, baseY - 80 + bob],
        ], 4), accent, { seed: seed + 18 });
      } else if (look.hat === 'flowers') {
        dot(g, null, cx - 26, headY - 34 + bob, 11, ink.petalPink, seed + 20);
        dot(g, null, cx, headY - 42 + bob, 11, ink.petalYellow, seed + 21);
        dot(g, null, cx + 26, headY - 34 + bob, 11, ink.petalViolet, seed + 22);
      } else if (look.hat === 'cap') {
        wash(g, smoothClosed(blob(cx, headY - 32 + bob, 40, 15, seed + 23, 0.08, 16), 5), accent, { seed: seed + 24 });
        wash(g, smoothClosed(blob(cx, headY - 24 + bob, 48, 8, seed + 25, 0.08, 16), 5), accent, { seed: seed + 26 });
      } else if (look.hat === 'bow') {
        wash(g, smoothClosed([[cx, headY - 36 + bob], [cx - 26, headY - 48 + bob], [cx - 26, headY - 26 + bob]], 5),
          accent, { seed: seed + 27 });
        wash(g, smoothClosed([[cx, headY - 36 + bob], [cx + 26, headY - 48 + bob], [cx + 26, headY - 26 + bob]], 5),
          accent, { seed: seed + 28 });
      }
    },
    shape: function (g) {
      fill(g, tail);
      for (let i = 0; i < ears.length; i++) fill(g, ears[i]);
      fill(g, body);
      fill(g, head);
    },
    ink: function (g) {
      inkStroke(g, muzzle, { width: 2.1, vary: 0.3, seed: seed + 35, color: ink.line, alpha: 0.8 });
      for (let i = 0; i < ears.length; i++) {
        inkStroke(g, ears[i], { width: 2.0, vary: 0.3, seed: seed + 37 + i, color: ink.line, alpha: 0.5 });
      }
      g.fillStyle = ink.line;
      if (frame === 1 && look.blink) {
        inkLine(g, cx - 22, headY - 2 + bob, cx - 8, headY - 2 + bob, { width: 2.2, bend: 0.3, seed: seed + 45 });
        inkLine(g, cx + 8, headY - 2 + bob, cx + 22, headY - 2 + bob, { width: 2.2, bend: 0.3, seed: seed + 46 });
      } else {
        fill(g, smoothClosed(blob(cx - 16, headY - 3 + bob, 4.6, 5.8, seed + 40, 0.08, 10), 4));
        fill(g, smoothClosed(blob(cx + 16, headY - 3 + bob, 4.6, 5.8, seed + 41, 0.08, 10), 4));
      }
      g.fillStyle = ink.line;
      fill(g, smoothClosed(blob(cx, headY + 13 + bob, 5.8, 4, seed + 42, 0.08, 10), 4));
      inkLine(g, cx, headY + 17 + bob, cx - 9, headY + 24 + bob, { width: 1.6, bend: 0.22, seed: seed + 43 });
      inkLine(g, cx, headY + 17 + bob, cx + 9, headY + 24 + bob, { width: 1.6, bend: -0.22, seed: seed + 44 });
      if (look.hat === 'glasses') {
        const gl = smoothClosed(blob(cx - 16, headY - 3 + bob, 12, 11, seed + 50, 0.06, 14), 5);
        const gr = smoothClosed(blob(cx + 16, headY - 3 + bob, 12, 11, seed + 51, 0.06, 14), 5);
        inkStroke(g, gl, { width: 2.4, vary: 0.25, seed: seed + 52, color: accent });
        inkStroke(g, gr, { width: 2.4, vary: 0.25, seed: seed + 53, color: accent });
        inkLine(g, cx - 5, headY - 4 + bob, cx + 5, headY - 4 + bob, { width: 2.0, bend: 0, seed: seed + 54, color: accent });
      }
      inkLine(g, cx - 32, baseY - 84 + bob, cx - 26, baseY - 66 + bob, { width: 1.4, bend: 0.15, seed: seed + 60, alpha: 0.35 });
      inkLine(g, cx + 32, baseY - 84 + bob, cx + 26, baseY - 66 + bob, { width: 1.4, bend: -0.15, seed: seed + 61, alpha: 0.35 });
    },
  });
  return made(res, w, h, cx, baseY);
}

/** Feuergeist – eine lebendige Flamme mit Gesicht. */
export function paintFlameSpirit(frame, opts) {
  const o = opts || {};
  const w = 130;
  const h = 190;
  const seed = (o.seed || 801) + frame * 11;
  const cx = w / 2;
  const baseY = h - 12;
  const bob = frame === 1 ? -5 : 0;

  const outer = smoothClosed(teardrop(cx, baseY - 70 + bob, 40, 72, seed, 0.16), 7);
  const mid = smoothClosed(teardrop(cx + 2, baseY - 56 + bob, 27, 52, seed + 1, 0.14), 7);
  const core = smoothClosed(teardrop(cx + 3, baseY - 40 + bob, 15, 32, seed + 2, 0.12), 7);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 3.5,
    outline: 3.0,
    outlineColor: '#a8482a',
    wash: function (g) {
      wash(g, outer, ink.emberDeep, { seed: seed + 5, scale: 1.05 });
      wash(g, mid, ink.ember, { seed: seed + 6 });
      wash(g, core, ink.emberLight, { seed: seed + 7 });
    },
    shape: function (g) { fill(g, outer); },
    ink: function (g) {
      inkStroke(g, mid, { width: 2.0, vary: 0.35, seed: seed + 10, color: '#c95f2c', alpha: 0.7 });
      g.fillStyle = '#5a3220';
      fill(g, smoothClosed(blob(cx - 13, baseY - 66 + bob, 4.6, 6, seed + 20, 0.08, 10), 4));
      fill(g, smoothClosed(blob(cx + 14, baseY - 66 + bob, 4.6, 6, seed + 21, 0.08, 10), 4));
      inkLine(g, cx - 6, baseY - 50 + bob, cx + 8, baseY - 50 + bob,
        { width: 2.0, bend: 0.4, seed: seed + 22, color: '#5a3220' });
    },
  });
  // Feuer bleibt farbig, auch wenn ringsum noch alles blass ist
  return made({ color: res.color, line: res.color }, w, h, cx, baseY);
}

/** Der Händler. */
export function paintFox(frame, opts) {
  const o = opts || {};
  const w = 140;
  const h = 172;
  const seed = (o.seed || 851) + frame * 9;
  const cx = w / 2;
  const baseY = h - 12;
  const headY = 62;
  const bob = frame === 1 ? -4 : 0;
  const fur = '#e09154';
  const furDark = '#c2703a';
  const light = '#f7ecd8';

  const tail = smoothClosed(blob(cx - 44, baseY - 44 + bob, 20, 30, seed, 0.14, 16), 6);
  const tailTip = smoothClosed(blob(cx - 50, baseY - 66 + bob, 13, 14, seed + 1, 0.12, 14), 5);
  const legL = smoothClosed([[cx - 20, baseY - 34 + bob], [cx - 22, baseY - 4], [cx - 8, baseY - 4], [cx - 8, baseY - 34 + bob]], 4);
  const legR = smoothClosed([[cx + 8, baseY - 34 + bob], [cx + 8, baseY - 4], [cx + 22, baseY - 4], [cx + 20, baseY - 34 + bob]], 4);
  const body = smoothClosed(blob(cx, baseY - 52 + bob, 32, 28, seed + 2, 0.07, 16), 5);
  const head = smoothClosed(blob(cx, headY + bob, 30, 26, seed + 3, 0.06, 18), 6);
  const earL = smoothClosed([[cx - 30, headY - 12 + bob], [cx - 22, headY - 50 + bob], [cx - 6, headY - 16 + bob]], 5);
  const earR = smoothClosed([[cx + 6, headY - 16 + bob], [cx + 22, headY - 50 + bob], [cx + 30, headY - 12 + bob]], 5);
  const snout = smoothClosed(blob(cx, headY + 17 + bob, 17, 12, seed + 4, 0.08, 14), 5);
  const vest = smoothClosed([
    [cx - 30, baseY - 74 + bob], [cx + 30, baseY - 74 + bob],
    [cx + 26, baseY - 44 + bob], [cx - 26, baseY - 44 + bob],
  ], 4);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 3,
    outline: 2.9,
    shadow: function (g) { groundShadow(g, cx, baseY - 2, 36, 11, seed + 5, 0.16); },
    wash: function (g) {
      wash(g, tail, fur, { seed: seed + 10, scale: 1.05 });
      wash(g, tailTip, light, { seed: seed + 11 });
      wash(g, legL, furDark, { seed: seed + 12 });
      wash(g, legR, furDark, { seed: seed + 13 });
      wash(g, body, fur, { seed: seed + 14, scale: 1.05 });
      wash(g, offsetShape(body, 0, 12, 0.72), light, { seed: seed + 15, alpha: 0.8 });
      wash(g, vest, ink.cloth, { seed: seed + 16 });
      for (let i = 0; i < 2; i++) {
        wash(g, i ? earR : earL, furDark, { seed: seed + 17 + i });
      }
      wash(g, head, fur, { seed: seed + 20, scale: 1.05 });
      wash(g, snout, light, { seed: seed + 21 });
    },
    shape: function (g) {
      fill(g, tail); fill(g, tailTip);
      fill(g, legL); fill(g, legR);
      fill(g, body); fill(g, earL); fill(g, earR); fill(g, head);
    },
    ink: function (g) {
      inkStroke(g, vest, { width: 2.2, vary: 0.3, seed: seed + 30, color: ink.line, alpha: 0.85 });
      inkStroke(g, snout, { width: 2.0, vary: 0.3, seed: seed + 31, color: ink.line, alpha: 0.6 });
      inkStroke(g, earL, { width: 2.0, vary: 0.3, seed: seed + 32, color: ink.line, alpha: 0.5 });
      inkStroke(g, earR, { width: 2.0, vary: 0.3, seed: seed + 33, color: ink.line, alpha: 0.5 });
      g.fillStyle = ink.line;
      fill(g, smoothClosed(blob(cx - 12, headY - 2 + bob, 4, 5, seed + 40, 0.08, 10), 4));
      fill(g, smoothClosed(blob(cx + 12, headY - 2 + bob, 4, 5, seed + 41, 0.08, 10), 4));
      fill(g, smoothClosed(blob(cx, headY + 12 + bob, 5.4, 4, seed + 42, 0.08, 10), 4));
      inkLine(g, cx, headY + 16 + bob, cx - 8, headY + 22 + bob, { width: 1.5, bend: 0.2, seed: seed + 43 });
      inkLine(g, cx, headY + 16 + bob, cx + 8, headY + 22 + bob, { width: 1.5, bend: -0.2, seed: seed + 44 });
    },
  });
  return made(res, w, h, cx, baseY);
}
