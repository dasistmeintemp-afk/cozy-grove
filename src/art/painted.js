/**
 * Gemalte Objekte im Tinte-und-Aquarell-Stil.
 *
 * Jedes Objekt wird in vier Durchgängen aufgebaut:
 *   shadow  – weicher Bodenschatten
 *   wash    – Farbflächen, absichtlich leicht neben der Form (werden weich)
 *   shape   – die reine Silhouette; daraus entsteht EINE Außenkontur
 *   ink     – Innenlinien und Details, scharf obendrauf
 *
 * Über `mode: 'line'` bleibt nur die Zeichnung übrig – der unkolorierte
 * Zustand der Insel.
 */
import {
  blob, teardrop, smoothClosed, offsetShape, pathFrom,
  inkStroke, inkLine, wash, paintObject, groundShadow,
} from './brush.js';
import { makeRng } from '../core/rng.js';

/** Farbwelt nach dem Vorbild: warmes Papier, Tinte in Sepia statt Schwarz. */
export const INK = {
  line: '#4a4038',
  lineSoft: '#7a6f5e',
  paper: '#f8f3e7',
  paperShade: '#ece4d0',

  leaf: '#a6c95f',
  leafLight: '#cbe291',
  leafDark: '#7fa546',
  leafDeep: '#5f8438',
  pine: '#6f9a4a',
  pineDark: '#4f7a3f',
  pineLight: '#95bb5f',

  trunk: '#e4d6b8',
  trunkShade: '#c2aa82',
  bark: '#c9ab7f',

  grass: '#c2d68f',
  grassLight: '#dce8b4',
  grassDark: '#9cb968',

  sand: '#f7edd4',
  sandShade: '#e8d7ae',

  water: '#63c8c9',
  waterLight: '#9ce0de',
  waterDeep: '#36a6b0',
  waterDark: '#248a97',
  foam: '#f0fbf9',

  rock: '#f1eee1',
  rockShade: '#cdd1bf',
  moss: '#a4b96e',

  warm: '#eaa74e',
  ember: '#f0913f',
  emberLight: '#f9d081',
  berry: '#d9705f',
  petalPink: '#f0a7b4',
  petalYellow: '#f7d97e',
  petalViolet: '#b9a3dd',
  petalWhite: '#fdfaf2',

  fur: '#e9dfc9',
  furShade: '#cabd9f',
  skin: '#f2d6b2',
  skinShade: '#dcb88d',
  cloth: '#7fb0bd',
  clothDark: '#5b8c9a',
  hat: '#e9a74e',
  boot: '#7d6c56',
};

const ink = INK;

function fill(g, pts) {
  pathFrom(g, pts, true);
  g.fill();
}

/** Kleiner farbiger Punkt mit eigener Kontur (Beere, Frucht, Auge). */
function dot(gWash, gInk, x, y, r, color, seed) {
  const pts = smoothClosed(blob(x, y, r, r, seed, 0.1, 10), 4);
  if (gWash) {
    gWash.fillStyle = color;
    fill(gWash, pts);
  }
  if (gInk) inkStroke(gInk, pts, { width: 1.6, vary: 0.3, seed: seed + 1, color: ink.line });
  return pts;
}

/* ------------------------------------------------------------------ Bäume */

/** Laubbaum: pralle Krone aus mehreren Lappen, heller Stamm. */
export function paintTree(opts) {
  const o = opts || {};
  const w = 180;
  const h = 224;
  const seed = o.seed || 21;
  const rng = makeRng(seed);
  const cx = w / 2;
  const baseY = h - 14;
  const canopyY = baseY - 132;

  const leafMid = o.leaf || ink.leaf;
  const leafLight = o.leafLight || ink.leafLight;
  const leafDark = o.leafDark || ink.leafDark;

  // Die Krone lebt von vielen kleinen Ausbuchtungen. Seit der Umriss aus der
  // Silhouette kommt, darf sie ruhig unruhig sein – vorher hätte das die
  // Linienführung zerlegt.
  const lobes = [
    smoothClosed(teardrop(cx, canopyY - 6, 58, 50, seed + 1, 0.17), 7),
    smoothClosed(blob(cx - 44, canopyY + 26, 36, 30, seed + 2, 0.2), 7),
    smoothClosed(blob(cx + 46, canopyY + 22, 34, 29, seed + 3, 0.2), 7),
    smoothClosed(blob(cx + 2, canopyY + 48, 47, 28, seed + 4, 0.18), 7),
    smoothClosed(blob(cx - 26, canopyY - 24, 27, 24, seed + 5, 0.22), 7),
    smoothClosed(blob(cx + 30, canopyY - 18, 25, 23, seed + 6, 0.22), 7),
  ];

  // Stamm reicht bis in die Krone hinein, damit kein Pilzstiel entsteht
  const trunk = smoothClosed([
    [cx - 14, baseY], [cx - 24, baseY - 5], [cx - 15, baseY - 24],
    [cx - 12, baseY - 56], [cx - 14, canopyY + 40],
    [cx + 14, canopyY + 38], [cx + 12, baseY - 58],
    [cx + 16, baseY - 22], [cx + 26, baseY - 4], [cx + 14, baseY],
  ], 5);

  return paintObject(w, h, {
    mode: o.mode,
    seed: seed,
    blur: 3.5,
    outline: 3.0,
    shadow: function (g) { groundShadow(g, cx + 4, baseY - 3, 54, 15, seed, 0.16); },
    wash: function (g) {
      wash(g, trunk, ink.trunk, { seed: seed + 9, dx: -2, dy: 2, scale: 1.04 });
      wash(g, offsetShape(trunk, 8, 4, 0.66), ink.trunkShade, { seed: seed + 10, alpha: 0.85 });
      for (let i = 0; i < lobes.length; i++) {
        wash(g, lobes[i], leafMid, { seed: seed + 20 + i, scale: 1.05 });
      }
      wash(g, offsetShape(lobes[0], -18, -16, 0.6), leafLight, { seed: seed + 31, alpha: 0.9 });
      wash(g, offsetShape(lobes[3], 14, 12, 0.78), leafDark, { seed: seed + 32, alpha: 0.5 });
      wash(g, offsetShape(lobes[2], 12, 8, 0.68), leafDark, { seed: seed + 33, alpha: 0.38 });
      if (o.fruit) {
        for (let i = 0; i < 3; i++) {
          dot(g, null, cx - 34 + rng() * 68, canopyY + 6 + rng() * 44, 7.5, o.fruit, seed + 90 + i);
        }
      }
    },
    shape: function (g) {
      fill(g, trunk);
      for (let i = 0; i < lobes.length; i++) fill(g, lobes[i]);
    },
    ink: function (g) {
      // Andeutung der Kronenlappen: nur kurze Bögen, keine vollen Umrisse
      inkLine(g, cx - 46, canopyY + 16, cx - 14, canopyY + 34,
        { width: 2.1, bend: 0.3, seed: seed + 60, color: ink.line, alpha: 0.75 });
      inkLine(g, cx + 48, canopyY + 12, cx + 16, canopyY + 32,
        { width: 2.0, bend: -0.3, seed: seed + 61, color: ink.line, alpha: 0.7 });
      inkLine(g, cx - 26, canopyY + 56, cx + 26, canopyY + 52,
        { width: 1.9, bend: 0.22, seed: seed + 62, color: ink.line, alpha: 0.6 });
      // Rinde
      inkLine(g, cx - 6, baseY - 26, cx - 4, baseY - 66,
        { width: 1.6, bend: 0.05, seed: seed + 41, alpha: 0.55 });
      inkLine(g, cx + 6, baseY - 18, cx + 7, baseY - 50,
        { width: 1.4, bend: -0.05, seed: seed + 42, alpha: 0.45 });
      // Blattkerben am Rand
      const rng2 = makeRng(seed + 500);
      for (let i = 0; i < 9; i++) {
        const a = rng2() * Math.PI * 2;
        const r = 0.45 + rng2() * 0.45;
        const x = cx + Math.cos(a) * 58 * r;
        const y = canopyY + 12 + Math.sin(a) * 48 * r;
        inkLine(g, x, y, x + 8 - rng2() * 16, y - 5 - rng2() * 6,
          { width: 1.3, bend: 0.35, seed: seed + 70 + i, alpha: 0.4 });
      }
      if (o.fruit) {
        const rng3 = makeRng(seed);
        for (let i = 0; i < 3; i++) {
          dot(null, g, cx - 34 + rng3() * 68, canopyY + 6 + rng3() * 44, 7.5, o.fruit, seed + 90 + i);
        }
      }
    },
  });
}

/** Nadelbaum: gestapelte, weiche Kegel. */
export function paintPine(opts) {
  const o = opts || {};
  const w = 158;
  const h = 248;
  const seed = o.seed || 55;
  const cx = w / 2;
  const baseY = h - 12;

  const trunk = smoothClosed([
    [cx - 11, baseY], [cx - 20, baseY - 4], [cx - 10, baseY - 26],
    [cx - 9, baseY - 64], [cx + 9, baseY - 64], [cx + 10, baseY - 26],
    [cx + 20, baseY - 4], [cx + 11, baseY],
  ], 5);

  const tiers = [];
  const spec = [[baseY - 50, 64, 42], [baseY - 94, 53, 38], [baseY - 134, 41, 33], [baseY - 170, 27, 27]];
  for (let i = 0; i < spec.length; i++) {
    const s = spec[i];
    const pts = smoothClosed(blob(cx, s[0] - s[2] * 0.35, s[1], s[2], seed + i * 7, 0.19, 22), 7);
    for (let k = 0; k < pts.length; k++) {
      const rel = (pts[k][1] - (s[0] - s[2] * 1.35)) / (s[2] * 1.7);
      pts[k][0] = cx + (pts[k][0] - cx) * (0.3 + Math.max(0, rel) * 1.0);
      if (pts[k][1] > s[0]) pts[k][1] = s[0] + (pts[k][1] - s[0]) * 0.22;
    }
    tiers.push(pts);
  }

  return paintObject(w, h, {
    mode: o.mode,
    seed: seed,
    blur: 3.5,
    outline: 3.0,
    shadow: function (g) { groundShadow(g, cx + 3, baseY - 3, 46, 13, seed, 0.16); },
    wash: function (g) {
      wash(g, trunk, ink.trunk, { seed: seed + 3, dx: -1, dy: 2 });
      wash(g, offsetShape(trunk, 7, 2, 0.66), ink.trunkShade, { seed: seed + 4, alpha: 0.8 });
      for (let i = 0; i < tiers.length; i++) {
        wash(g, tiers[i], ink.pine, { seed: seed + 12 + i, scale: 1.05 });
        wash(g, offsetShape(tiers[i], -14, -9, 0.5), ink.pineLight, { seed: seed + 22 + i, alpha: 0.55 });
        wash(g, offsetShape(tiers[i], 15, 9, 0.55), ink.pineDark, { seed: seed + 32 + i, alpha: 0.45 });
      }
    },
    shape: function (g) {
      fill(g, trunk);
      for (let i = 0; i < tiers.length; i++) fill(g, tiers[i]);
    },
    ink: function (g) {
      // Trennlinien zwischen den Etagen, nur angedeutet
      for (let i = 0; i < tiers.length - 1; i++) {
        const y = spec[i][0] - 2;
        inkLine(g, cx - spec[i][1] * 0.55, y, cx + spec[i][1] * 0.55, y - 3,
          { width: 1.9, bend: 0.16, seed: seed + 80 + i, alpha: 0.6 });
      }
      inkLine(g, cx - 3, baseY - 20, cx - 2, baseY - 52, { width: 1.4, bend: 0.05, seed: seed + 90, alpha: 0.45 });
    },
  });
}

/* ------------------------------------------------------------------ Steine */

export function paintRock(opts) {
  const o = opts || {};
  const w = 124;
  const h = 96;
  const seed = o.seed || 77;
  const cx = w / 2;
  const baseY = h - 12;

  const body = smoothClosed(blob(cx, baseY - 30, 44, 31, seed, 0.14, 18));
  for (let i = 0; i < body.length; i++) {
    if (body[i][1] > baseY - 6) body[i][1] = baseY - 6 + (body[i][1] - (baseY - 6)) * 0.18;
  }
  const moss = smoothClosed(blob(cx - 11, baseY - 52, 21, 9, seed + 5, 0.28, 12), 4);

  return paintObject(w, h, {
    mode: o.mode,
    seed: seed,
    blur: 3,
    outline: 2.8,
    shadow: function (g) { groundShadow(g, cx + 4, baseY - 3, 42, 11, seed + 1, 0.15); },
    wash: function (g) {
      wash(g, body, ink.rock, { seed: seed + 2, scale: 1.05 });
      wash(g, offsetShape(body, 13, 10, 0.7), ink.rockShade, { seed: seed + 3, alpha: 0.75 });
      if (o.moss !== false) wash(g, moss, ink.moss, { seed: seed + 6, alpha: 0.75 });
      if (o.ore) {
        dot(g, null, cx + 11, baseY - 34, 9, ink.ember, seed + 8);
        dot(g, null, cx - 15, baseY - 22, 7, ink.ember, seed + 11);
      }
    },
    shape: function (g) { fill(g, body); },
    ink: function (g) {
      inkLine(g, cx - 7, baseY - 55, cx + 2, baseY - 26, { width: 1.8, bend: 0.16, seed: seed + 21, alpha: 0.6 });
      inkLine(g, cx + 2, baseY - 32, cx + 21, baseY - 21, { width: 1.5, bend: -0.12, seed: seed + 22, alpha: 0.45 });
      if (o.ore) {
        dot(null, g, cx + 11, baseY - 34, 9, ink.ember, seed + 8);
        dot(null, g, cx - 15, baseY - 22, 7, ink.ember, seed + 11);
      }
    },
  });
}

/* ------------------------------------------------------------- Kleinpflanzen */

export function paintBush(opts) {
  const o = opts || {};
  const w = 132;
  const h = 100;
  const seed = o.seed || 91;
  const cx = w / 2;
  const baseY = h - 12;
  const rng = makeRng(seed);
  const berries = [];
  for (let i = 0; i < 5; i++) {
    berries.push([cx - 33 + rng() * 66, baseY - 50 + rng() * 32]);
  }

  const lobes = [
    smoothClosed(blob(cx, baseY - 34, 42, 27, seed + 1, 0.1)),
    smoothClosed(blob(cx - 27, baseY - 21, 26, 19, seed + 2, 0.11)),
    smoothClosed(blob(cx + 28, baseY - 23, 25, 19, seed + 3, 0.11)),
  ];

  return paintObject(w, h, {
    mode: o.mode,
    seed: seed,
    blur: 3,
    outline: 2.7,
    shadow: function (g) { groundShadow(g, cx + 3, baseY - 3, 44, 11, seed + 4, 0.14); },
    wash: function (g) {
      for (let i = 0; i < lobes.length; i++) wash(g, lobes[i], ink.leaf, { seed: seed + 10 + i, scale: 1.05 });
      wash(g, offsetShape(lobes[0], -13, -11, 0.58), ink.leafLight, { seed: seed + 20, alpha: 0.8 });
      wash(g, offsetShape(lobes[0], 12, 11, 0.68), ink.leafDark, { seed: seed + 21, alpha: 0.45 });
      if (o.berries) {
        for (let i = 0; i < berries.length; i++) {
          dot(g, null, berries[i][0], berries[i][1], 6, ink.berry, seed + 40 + i);
        }
      }
    },
    shape: function (g) { for (let i = 0; i < lobes.length; i++) fill(g, lobes[i]); },
    ink: function (g) {
      inkLine(g, cx - 30, baseY - 30, cx - 6, baseY - 40, { width: 1.8, bend: 0.28, seed: seed + 30, alpha: 0.6 });
      inkLine(g, cx + 31, baseY - 31, cx + 8, baseY - 41, { width: 1.8, bend: -0.28, seed: seed + 31, alpha: 0.55 });
      if (o.berries) {
        for (let i = 0; i < berries.length; i++) {
          dot(null, g, berries[i][0], berries[i][1], 6, ink.berry, seed + 40 + i);
        }
      }
    },
  });
}

export function paintFlower(opts) {
  const o = opts || {};
  const w = 60;
  const h = 82;
  const seed = o.seed || 131;
  const cx = w / 2;
  const baseY = h - 10;
  const headY = 26;
  const petal = o.petal || ink.petalPink;

  const head = smoothClosed(blob(cx, headY, 15, 14, seed, 0.14, 14));
  const stem = smoothClosed([[cx - 3, baseY], [cx - 4, headY + 12], [cx + 4, headY + 12], [cx + 3, baseY]], 4);
  const leaf = smoothClosed(blob(cx - 13, baseY - 26, 12, 6, seed + 3, 0.2, 12), 4);

  return paintObject(w, h, {
    mode: o.mode,
    seed: seed,
    blur: 2,
    outline: 2.0,
    shadow: function (g) { groundShadow(g, cx, baseY - 2, 13, 5, seed + 1, 0.11); },
    wash: function (g) {
      wash(g, stem, ink.grassDark, { seed: seed + 2, dx: 0, dy: 0 });
      wash(g, leaf, ink.grass, { seed: seed + 4 });
      wash(g, head, petal, { seed: seed + 5, scale: 1.07 });
      wash(g, smoothClosed(blob(cx, headY, 6, 6, seed + 6, 0.18, 10), 4), ink.petalYellow, { seed: seed + 7 });
    },
    shape: function (g) {
      fill(g, stem);
      fill(g, leaf);
      fill(g, head);
    },
    ink: function (g) {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.4;
        inkLine(g, cx + Math.cos(a) * 5, headY + Math.sin(a) * 5,
          cx + Math.cos(a) * 12, headY + Math.sin(a) * 11,
          { width: 1.2, bend: 0.1, seed: seed + 20 + i, alpha: 0.5 });
      }
    },
  });
}

export function paintGrassTuft(opts) {
  const o = opts || {};
  const w = 70;
  const h = 54;
  const seed = o.seed || 171;
  const cx = w / 2;
  const baseY = h - 8;
  const rng = makeRng(seed);
  const blades = [];
  for (let i = 0; i < 5; i++) {
    blades.push({
      x: cx - 20 + i * 10 + rng() * 4,
      top: baseY - 20 - rng() * 20,
      lean: (rng() - 0.5) * 24,
    });
  }
  return paintObject(w, h, {
    mode: o.mode,
    seed: seed,
    blur: 3,
    wash: function (g) {
      wash(g, smoothClosed(blob(cx, baseY - 9, 24, 9, seed + 1, 0.22, 12), 4),
        ink.grass, { seed: seed + 2, alpha: 0.8 });
    },
    ink: function (g) {
      for (let i = 0; i < blades.length; i++) {
        const b = blades[i];
        inkLine(g, b.x, baseY, b.x + b.lean, b.top,
          { width: 1.9, bend: 0.24, seed: seed + 10 + i, color: ink.lineSoft });
      }
    },
  });
}

/* --------------------------------------------------------------- Lagerfeuer */

export function paintCampfire(opts) {
  const o = opts || {};
  const w = 156;
  const h = 138;
  const seed = o.seed || 211;
  const cx = w / 2;
  const baseY = h - 16;
  const stones = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3;
    stones.push(smoothClosed(blob(
      cx + Math.cos(a) * 48, baseY - 8 + Math.sin(a) * 19, 15, 11, seed + i, 0.16, 12
    ), 4));
  }
  const logA = smoothClosed([
    [cx - 40, baseY - 8], [cx - 34, baseY - 20], [cx + 30, baseY - 30],
    [cx + 38, baseY - 22], [cx + 30, baseY - 12], [cx - 34, baseY - 2],
  ], 5);
  const logB = smoothClosed([
    [cx - 36, baseY - 30], [cx - 28, baseY - 38], [cx + 34, baseY - 14],
    [cx + 40, baseY - 4], [cx + 28, baseY - 6], [cx - 30, baseY - 22],
  ], 5);
  const flame = smoothClosed(teardrop(cx, baseY - 60, 25, 38, seed + 30, 0.13));
  const flameIn = smoothClosed(teardrop(cx + 2, baseY - 50, 14, 24, seed + 31, 0.12));

  return paintObject(w, h, {
    mode: o.mode,
    seed: seed,
    blur: 3,
    outline: 2.5,
    shadow: function (g) { groundShadow(g, cx, baseY - 4, 58, 17, seed + 40, 0.13); },
    wash: function (g) {
      for (let i = 0; i < stones.length; i++) {
        wash(g, stones[i], ink.rock, { seed: seed + 50 + i });
        wash(g, offsetShape(stones[i], 5, 4, 0.6), ink.rockShade, { seed: seed + 60 + i, alpha: 0.7 });
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
      // Die Flamme brennt immer – auch im unkolorierten Zustand
      if (o.lit !== false) {
        g.fillStyle = ink.ember;
        fill(g, flame);
        g.fillStyle = ink.emberLight;
        fill(g, flameIn);
        inkStroke(g, flame, { width: 2.4, vary: 0.35, seed: seed + 92, color: '#b8613a' });
        inkStroke(g, flameIn, { width: 1.5, vary: 0.3, seed: seed + 93, color: '#d98a44', alpha: 0.8 });
      }
      inkLine(g, cx - 20, baseY - 16, cx + 18, baseY - 24, { width: 1.5, bend: 0.08, seed: seed + 95, alpha: 0.5 });
    },
  });
}

/* ------------------------------------------------------------------- Figuren */

/** Spielfigur: großer Kopf, kleiner Körper, Hut. */
export function paintScout(opts) {
  const o = opts || {};
  const w = 116;
  const h = 158;
  const seed = o.seed || 301;
  const cx = w / 2;
  const baseY = h - 10;
  const headY = 56;

  const legL = smoothClosed([[cx - 16, baseY - 28], [cx - 18, baseY - 4], [cx - 5, baseY - 3], [cx - 5, baseY - 28]], 4);
  const legR = smoothClosed([[cx + 5, baseY - 28], [cx + 5, baseY - 3], [cx + 18, baseY - 4], [cx + 16, baseY - 28]], 4);
  const body = smoothClosed(blob(cx, baseY - 42, 26, 23, seed + 1, 0.06, 16));
  const armL = smoothClosed(blob(cx - 27, baseY - 44, 9, 16, seed + 2, 0.08, 12));
  const armR = smoothClosed(blob(cx + 27, baseY - 44, 9, 16, seed + 3, 0.08, 12));
  const head = smoothClosed(blob(cx, headY, 32, 30, seed + 4, 0.045, 20));
  const brim = smoothClosed(blob(cx, headY - 20, 43, 12, seed + 5, 0.07, 18));
  const crown = smoothClosed(blob(cx, headY - 32, 22, 15, seed + 6, 0.07, 14));

  return paintObject(w, h, {
    mode: o.mode,
    seed: seed,
    blur: 2.5,
    outline: 2.7,
    shadow: function (g) { groundShadow(g, cx, baseY - 2, 30, 9, seed + 7, 0.17); },
    wash: function (g) {
      wash(g, legL, ink.boot, { seed: seed + 10 });
      wash(g, legR, ink.boot, { seed: seed + 11 });
      wash(g, armL, ink.cloth, { seed: seed + 14 });
      wash(g, armR, ink.cloth, { seed: seed + 15 });
      wash(g, body, ink.cloth, { seed: seed + 12, scale: 1.05 });
      wash(g, offsetShape(body, 10, 7, 0.6), ink.clothDark, { seed: seed + 13, alpha: 0.7 });
      wash(g, head, ink.skin, { seed: seed + 16, scale: 1.05 });
      wash(g, offsetShape(head, 12, 8, 0.58), ink.skinShade, { seed: seed + 17, alpha: 0.45 });
      wash(g, brim, ink.hat, { seed: seed + 18, scale: 1.05 });
      wash(g, crown, ink.hat, { seed: seed + 19 });
      wash(g, offsetShape(crown, 6, 4, 0.7), '#cf8b38', { seed: seed + 21, alpha: 0.6 });
    },
    shape: function (g) {
      fill(g, legL); fill(g, legR);
      fill(g, armL); fill(g, armR);
      fill(g, body); fill(g, head);
      fill(g, crown); fill(g, brim);
    },
    ink: function (g) {
      // Hutkrempe vom Kopf trennen
      inkStroke(g, brim, { width: 2.2, vary: 0.35, seed: seed + 50, color: ink.line, alpha: 0.9 });
      inkLine(g, cx - 5, baseY - 20, cx - 5, baseY - 4, { width: 1.8, bend: 0, seed: seed + 51, alpha: 0.7 });
      inkLine(g, cx - 22, baseY - 46, cx - 20, baseY - 30, { width: 1.6, bend: 0.1, seed: seed + 52, alpha: 0.5 });
      inkLine(g, cx + 22, baseY - 46, cx + 20, baseY - 30, { width: 1.6, bend: -0.1, seed: seed + 53, alpha: 0.5 });
      // Gesicht
      g.fillStyle = ink.line;
      fill(g, smoothClosed(blob(cx - 11, headY + 3, 3.6, 4.6, seed + 40, 0.08, 10), 4));
      fill(g, smoothClosed(blob(cx + 11, headY + 3, 3.6, 4.6, seed + 41, 0.08, 10), 4));
      inkLine(g, cx - 5, headY + 15, cx + 5, headY + 15, { width: 1.7, bend: 0.4, seed: seed + 42 });
      g.globalAlpha = 0.4;
      g.fillStyle = '#e79a92';
      fill(g, smoothClosed(blob(cx - 19, headY + 10, 6, 4, seed + 43, 0.1, 10), 4));
      fill(g, smoothClosed(blob(cx + 19, headY + 10, 6, 4, seed + 44, 0.1, 10), 4));
      g.globalAlpha = 1;
    },
  });
}

/** Geist: runde Bärengestalt mit ausgefranstem Schweif. */
export function paintSpirit(opts) {
  const o = opts || {};
  const w = 142;
  const h = 178;
  const seed = o.seed || 401;
  const cx = w / 2;
  const baseY = h - 12;
  const headY = 64;
  const fur = o.fur || ink.fur;
  const furShade = o.furShade || ink.furShade;
  const accent = o.accent || ink.berry;

  const tailPts = [];
  const tailTop = baseY - 58;
  tailPts.push([cx - 36, tailTop]);
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    tailPts.push([cx - 36 + t * 72, baseY - 6 - (i % 2 === 0 ? 0 : 17)]);
  }
  tailPts.push([cx + 36, tailTop]);
  const tail = smoothClosed(tailPts, 5);

  const body = smoothClosed(blob(cx, baseY - 68, 41, 34, seed + 1, 0.06, 18));
  const head = smoothClosed(blob(cx, headY, 41, 37, seed + 2, 0.05, 20));
  const earL = smoothClosed(blob(cx - 33, headY - 29, 13, 13, seed + 3, 0.08, 12));
  const earR = smoothClosed(blob(cx + 33, headY - 29, 13, 13, seed + 4, 0.08, 12));
  const muzzle = smoothClosed(blob(cx, headY + 17, 19, 13, seed + 5, 0.07, 14));
  const scarf = smoothClosed([
    [cx - 35, baseY - 92], [cx + 35, baseY - 94], [cx + 31, baseY - 78], [cx - 31, baseY - 76],
  ], 4);

  return paintObject(w, h, {
    mode: o.mode,
    seed: seed,
    blur: 3,
    outline: 3.0,
    wash: function (g) {
      wash(g, tail, fur, { seed: seed + 10, alpha: 0.7 });
      wash(g, body, fur, { seed: seed + 11, scale: 1.05 });
      wash(g, offsetShape(body, 14, 9, 0.6), furShade, { seed: seed + 12, alpha: 0.55 });
      wash(g, earL, furShade, { seed: seed + 13 });
      wash(g, earR, furShade, { seed: seed + 14 });
      wash(g, head, fur, { seed: seed + 15, scale: 1.05 });
      wash(g, offsetShape(head, 14, 10, 0.58), furShade, { seed: seed + 16, alpha: 0.42 });
      wash(g, muzzle, '#faf4e6', { seed: seed + 17 });
      wash(g, scarf, accent, { seed: seed + 18 });
    },
    shape: function (g) {
      fill(g, tail);
      fill(g, earL); fill(g, earR);
      fill(g, body); fill(g, head);
    },
    ink: function (g) {
      inkStroke(g, muzzle, { width: 2.1, vary: 0.3, seed: seed + 35, color: ink.line, alpha: 0.85 });
      inkStroke(g, scarf, { width: 2.2, vary: 0.3, seed: seed + 36, color: ink.line, alpha: 0.9 });
      inkStroke(g, earL, { width: 2.0, vary: 0.3, seed: seed + 37, color: ink.line, alpha: 0.6 });
      inkStroke(g, earR, { width: 2.0, vary: 0.3, seed: seed + 38, color: ink.line, alpha: 0.6 });
      g.fillStyle = ink.line;
      fill(g, smoothClosed(blob(cx - 15, headY - 3, 4.4, 5.6, seed + 40, 0.08, 10), 4));
      fill(g, smoothClosed(blob(cx + 15, headY - 3, 4.4, 5.6, seed + 41, 0.08, 10), 4));
      fill(g, smoothClosed(blob(cx, headY + 11, 5.4, 3.8, seed + 42, 0.08, 10), 4));
      inkLine(g, cx, headY + 15, cx - 8, headY + 21, { width: 1.6, bend: 0.22, seed: seed + 43 });
      inkLine(g, cx, headY + 15, cx + 8, headY + 21, { width: 1.6, bend: -0.22, seed: seed + 44 });
      // Fellstriche
      inkLine(g, cx - 30, baseY - 78, cx - 24, baseY - 62, { width: 1.4, bend: 0.15, seed: seed + 45, alpha: 0.4 });
      inkLine(g, cx + 30, baseY - 78, cx + 24, baseY - 62, { width: 1.4, bend: -0.15, seed: seed + 46, alpha: 0.4 });
    },
  });
}
