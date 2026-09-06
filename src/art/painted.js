/**
 * Gemalte Naturobjekte im Tinte-und-Aquarell-Stil.
 *
 * Jedes Objekt wird in vier Durchgängen aufgebaut:
 *   shadow  – weicher Bodenschatten
 *   wash    – Farbflächen, absichtlich leicht neben der Form (werden weich)
 *   shape   – die reine Silhouette; daraus entsteht EINE Außenkontur
 *   ink     – Innenlinien und Details, scharf obendrauf
 *
 * Jeder Maler liefert beide Fassungen zurück: koloriert und als blasse
 * Zeichnung. Die zweite ist der Ausgangszustand der Insel.
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
  autumn: '#e2a04c',
  autumnLight: '#f2c87e',
  autumnDark: '#c07a30',
  birchLeaf: '#bcd66e',
  birchLight: '#dcea9f',
  birchDark: '#94b352',

  trunk: '#d7bf94',
  trunkShade: '#a98a5d',
  bark: '#c19566',
  barkDark: '#966f45',
  birchBark: '#f2ece0',
  birchShade: '#cfc6ae',

  grass: '#c2d68f',
  grassLight: '#dce8b4',
  grassDark: '#9cb968',

  sand: '#f7edd4',
  sandShade: '#e8d7ae',
  dirt: '#cdb185',
  dirtDark: '#9d8358',

  water: '#63c8c9',
  waterLight: '#9ce0de',
  waterDeep: '#36a6b0',
  waterDark: '#248a97',
  foam: '#f0fbf9',

  rock: '#dcd8c6',
  rockShade: '#aeb2a0',
  rockDeep: '#8d9282',
  moss: '#a4b96e',
  copper: '#e08a4a',

  warm: '#eaa74e',
  ember: '#f0913f',
  emberLight: '#f9d081',
  emberDeep: '#d9662e',
  berry: '#d9705f',
  petalPink: '#f0a7b4',
  petalYellow: '#f7d97e',
  petalViolet: '#b9a3dd',
  petalWhite: '#fdfaf2',
  mushroomCap: '#e2705c',
  mushroomStem: '#f6ecd8',

  fur: '#e9dfc9',
  furShade: '#cabd9f',
  skin: '#f2d6b2',
  skinShade: '#dcb88d',
  cloth: '#7fb0bd',
  clothDark: '#5b8c9a',
  hat: '#e9a74e',
  boot: '#7d6c56',

  wood: '#d8b98a',
  woodDark: '#b3925f',
  iron: '#b9bfc4',
  ironDark: '#8d949b',
  gold: '#e8c34c',
  glass: '#bfe2e6',
  bone: '#f2ead6',
  cloth2: '#a992c9',
};

const ink = INK;

/* -------------------------------------------------------------- Hilfsmittel */

export function fill(g, pts) {
  pathFrom(g, pts, true);
  g.fill();
}

/**
 * Ergebnis eines Malers mit Maßen und Fußpunkt.
 * `paintObject` legt einen Rand um die Zeichenfläche; Maße und Fußpunkt
 * wandern entsprechend mit, damit das Objekt an derselben Stelle steht.
 */
export function made(res, w, h, ax, ay) {
  const m = res.margin || 0;
  return {
    color: res.color, line: res.line,
    w: w + m * 2, h: h + m * 2, ax: ax + m, ay: ay + m,
  };
}

/** Kleiner farbiger Punkt mit eigener Kontur (Beere, Frucht, Auge). */
export function dot(gWash, gInk, x, y, r, color, seed) {
  const pts = smoothClosed(blob(x, y, r, r, seed, 0.1, 10), 4);
  if (gWash) {
    gWash.fillStyle = color;
    fill(gWash, pts);
  }
  if (gInk) inkStroke(gInk, pts, { width: 1.6, vary: 0.3, seed: seed + 1, color: ink.line });
  return pts;
}

/* ------------------------------------------------------------------ Bäume */

/**
 * Laubbaum. Über `leaf`/`leafLight`/`leafDark` entstehen daraus Eiche,
 * Birke und Ahorn – der Aufbau ist derselbe.
 */
export function paintTree(opts) {
  const o = opts || {};
  // `spread` breitet die Krone aus, `lift` streckt sie nach oben. Damit wird
  // aus demselben Maler eine breite und eine schlanke Silhouette – im dichten
  // Wald faellt sonst auf, dass alle Baeume dieselbe Form haben.
  const spread = o.spread == null ? 1 : o.spread;
  const lift = o.lift == null ? 1 : o.lift;
  const w = Math.round(180 * Math.max(1, spread));
  const h = Math.round(224 * Math.max(1, lift));
  const seed = o.seed || 21;
  const cx = w / 2;
  const baseY = h - 14;
  const canopyY = baseY - 132 * lift;

  const leafMid = o.leaf || ink.leaf;
  const leafLight = o.leafLight || ink.leafLight;
  const leafDark = o.leafDark || ink.leafDark;
  const trunkFill = o.trunk || ink.trunk;
  const trunkShade = o.trunkShade || ink.trunkShade;

  // Die Krone lebt von vielen kleinen Ausbuchtungen. Da der Umriss aus der
  // Silhouette entsteht, darf sie ruhig unruhig sein.
  const sx = spread;
  const lobes = [
    smoothClosed(teardrop(cx, canopyY - 6, 58 * sx, 50, seed + 1, 0.17), 7),
    smoothClosed(blob(cx - 44 * sx, canopyY + 26, 36 * sx, 30, seed + 2, 0.2), 7),
    smoothClosed(blob(cx + 46 * sx, canopyY + 22, 34 * sx, 29, seed + 3, 0.2), 7),
    smoothClosed(blob(cx + 2, canopyY + 48, 47 * sx, 28, seed + 4, 0.18), 7),
    smoothClosed(blob(cx - 26 * sx, canopyY - 24, 27 * sx, 24, seed + 5, 0.22), 7),
    smoothClosed(blob(cx + 30 * sx, canopyY - 18, 25 * sx, 23, seed + 6, 0.22), 7),
  ];

  // Stamm reicht bis in die Krone hinein, sonst entsteht ein Pilzstiel
  const trunk = smoothClosed([
    [cx - 14, baseY], [cx - 24, baseY - 5], [cx - 15, baseY - 24],
    [cx - 12, baseY - 56], [cx - 14, canopyY + 40],
    [cx + 14, canopyY + 38], [cx + 12, baseY - 58],
    [cx + 16, baseY - 22], [cx + 26, baseY - 4], [cx + 14, baseY],
  ], 5);

  const rngFruit = makeRng(seed + 800);
  const fruits = [];
  if (o.fruit) {
    for (let i = 0; i < 3; i++) {
      fruits.push([cx - 34 * sx + rngFruit() * 68 * sx, canopyY + 6 + rngFruit() * 44]);
    }
  }

  const res = paintObject(w, h, {
    seed: seed,
    blur: 3.5,
    outline: 3.0,
    shadow: function (g) { groundShadow(g, cx + 4, baseY - 3, 54, 15, seed, 0.16); },
    wash: function (g) {
      wash(g, trunk, trunkFill, { seed: seed + 9, dx: -2, dy: 2, scale: 1.04 });
      wash(g, offsetShape(trunk, 8, 4, 0.66), trunkShade, { seed: seed + 10, alpha: 0.85 });
      for (let i = 0; i < lobes.length; i++) {
        wash(g, lobes[i], leafMid, { seed: seed + 20 + i, scale: 1.05 });
      }
      wash(g, offsetShape(lobes[0], -18, -16, 0.6), leafLight, { seed: seed + 31, alpha: 0.9 });
      wash(g, offsetShape(lobes[3], 14, 12, 0.78), leafDark, { seed: seed + 32, alpha: 0.5 });
      wash(g, offsetShape(lobes[2], 12, 8, 0.68), leafDark, { seed: seed + 33, alpha: 0.38 });
      for (let i = 0; i < fruits.length; i++) {
        dot(g, null, fruits[i][0], fruits[i][1], 7.5, o.fruit, seed + 90 + i);
      }
    },
    shape: function (g) {
      fill(g, trunk);
      for (let i = 0; i < lobes.length; i++) fill(g, lobes[i]);
    },
    ink: function (g) {
      // Kronenlappen nur andeuten, keine vollen Umrisse
      inkLine(g, cx - 46 * sx, canopyY + 16, cx - 14 * sx, canopyY + 34,
        { width: 2.1, bend: 0.3, seed: seed + 60, alpha: 0.7 });
      inkLine(g, cx + 48 * sx, canopyY + 12, cx + 16 * sx, canopyY + 32,
        { width: 2.0, bend: -0.3, seed: seed + 61, alpha: 0.65 });
      inkLine(g, cx - 26 * sx, canopyY + 56, cx + 26 * sx, canopyY + 52,
        { width: 1.9, bend: 0.22, seed: seed + 62, alpha: 0.55 });
      if (o.birchMarks) {
        for (let i = 0; i < 4; i++) {
          const y = baseY - 20 - i * 22;
          inkLine(g, cx - 9, y, cx - 2, y - 2, { width: 2.6, bend: 0, seed: seed + 100 + i, alpha: 0.8 });
          if (i % 2) inkLine(g, cx + 4, y - 10, cx + 10, y - 12, { width: 2.2, bend: 0, seed: seed + 110 + i, alpha: 0.7 });
        }
      } else {
        inkLine(g, cx - 6, baseY - 26, cx - 4, baseY - 66, { width: 1.6, bend: 0.05, seed: seed + 41, alpha: 0.5 });
        inkLine(g, cx + 6, baseY - 18, cx + 7, baseY - 50, { width: 1.4, bend: -0.05, seed: seed + 42, alpha: 0.42 });
      }
      const rng2 = makeRng(seed + 500);
      for (let i = 0; i < 9; i++) {
        const a = rng2() * Math.PI * 2;
        const r = 0.45 + rng2() * 0.45;
        const x = cx + Math.cos(a) * 58 * sx * r;
        const y = canopyY + 12 + Math.sin(a) * 48 * r;
        inkLine(g, x, y, x + 8 - rng2() * 16, y - 5 - rng2() * 6,
          { width: 1.3, bend: 0.35, seed: seed + 70 + i, alpha: 0.38 });
      }
      for (let i = 0; i < fruits.length; i++) {
        dot(null, g, fruits[i][0], fruits[i][1], 7.5, o.fruit, seed + 90 + i);
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

/** Nadelbaum: gestapelte, weiche Kegel. */
export function paintPine(opts) {
  const o = opts || {};
  const w = 176;
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

  const res = paintObject(w, h, {
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
      for (let i = 0; i < tiers.length - 1; i++) {
        const y = spec[i][0] - 2;
        inkLine(g, cx - spec[i][1] * 0.55, y, cx + spec[i][1] * 0.55, y - 3,
          { width: 1.9, bend: 0.16, seed: seed + 80 + i, alpha: 0.55 });
      }
      inkLine(g, cx - 3, baseY - 20, cx - 2, baseY - 52, { width: 1.4, bend: 0.05, seed: seed + 90, alpha: 0.42 });
    },
  });
  return made(res, w, h, cx, baseY);
}

export function paintStump(opts) {
  const o = opts || {};
  const w = 96;
  const h = 66;
  const seed = o.seed || 137;
  const cx = w / 2;
  const baseY = h - 10;

  const body = smoothClosed([
    [cx - 26, baseY], [cx - 32, baseY - 6], [cx - 27, baseY - 22],
    [cx - 25, baseY - 34], [cx + 25, baseY - 34], [cx + 27, baseY - 22],
    [cx + 32, baseY - 6], [cx + 26, baseY],
  ], 5);
  const top = smoothClosed(blob(cx, baseY - 36, 26, 9, seed + 2, 0.13, 16), 5);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 3,
    outline: 2.8,
    shadow: function (g) { groundShadow(g, cx + 3, baseY - 2, 30, 9, seed, 0.15); },
    wash: function (g) {
      wash(g, body, ink.bark, { seed: seed + 3, scale: 1.04 });
      wash(g, offsetShape(body, 9, 4, 0.62), ink.barkDark, { seed: seed + 4, alpha: 0.7 });
      wash(g, top, ink.trunk, { seed: seed + 5 });
      wash(g, offsetShape(top, 0, 0, 0.55), ink.trunkShade, { seed: seed + 6, alpha: 0.5 });
    },
    shape: function (g) { fill(g, body); fill(g, top); },
    ink: function (g) {
      inkStroke(g, top, { width: 2.2, vary: 0.3, seed: seed + 10, color: ink.line, alpha: 0.85 });
      inkStroke(g, offsetShape(top, 0, 1, 0.5), { width: 1.4, vary: 0.3, seed: seed + 11, color: ink.line, alpha: 0.5 });
      inkLine(g, cx - 12, baseY - 4, cx - 10, baseY - 26, { width: 1.5, bend: 0.06, seed: seed + 12, alpha: 0.45 });
      inkLine(g, cx + 11, baseY - 6, cx + 9, baseY - 24, { width: 1.4, bend: -0.06, seed: seed + 13, alpha: 0.4 });
    },
  });
  return made(res, w, h, cx, baseY);
}

/** Umgestürzter Stamm – die Sperre zum Wald. */
export function paintLogBarrier(opts) {
  const o = opts || {};
  const w = 216;
  const h = 100;
  const seed = o.seed || 151;
  const cx = w / 2;
  const baseY = h - 12;

  const log = smoothClosed([
    [16, baseY - 12], [22, baseY - 42], [w - 26, baseY - 46],
    [w - 14, baseY - 28], [w - 20, baseY - 8], [26, baseY - 2],
  ], 6);
  const capL = smoothClosed(blob(22, baseY - 26, 11, 20, seed + 2, 0.11, 14), 5);
  const capR = smoothClosed(blob(w - 20, baseY - 27, 10, 19, seed + 3, 0.11, 14), 5);
  const mossA = smoothClosed(blob(70, baseY - 44, 30, 11, seed + 4, 0.26, 14), 5);
  const mossB = smoothClosed(blob(152, baseY - 42, 24, 9, seed + 5, 0.26, 14), 5);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 3.5,
    outline: 3.0,
    shadow: function (g) { groundShadow(g, cx, baseY - 2, 92, 13, seed, 0.16); },
    wash: function (g) {
      wash(g, log, ink.bark, { seed: seed + 6, scale: 1.03 });
      wash(g, offsetShape(log, 0, 14, 0.9), ink.barkDark, { seed: seed + 7, alpha: 0.6 });
      wash(g, capL, ink.trunk, { seed: seed + 8 });
      wash(g, capR, ink.trunkShade, { seed: seed + 9 });
      wash(g, mossA, ink.moss, { seed: seed + 10, alpha: 0.8 });
      wash(g, mossB, ink.moss, { seed: seed + 11, alpha: 0.7 });
    },
    shape: function (g) { fill(g, log); fill(g, capL); fill(g, capR); },
    ink: function (g) {
      inkStroke(g, capL, { width: 2.4, vary: 0.3, seed: seed + 20, color: ink.line, alpha: 0.9 });
      inkStroke(g, offsetShape(capL, 0, 0, 0.5), { width: 1.5, vary: 0.3, seed: seed + 21, color: ink.line, alpha: 0.5 });
      for (let i = 0; i < 4; i++) {
        const x = 48 + i * 38;
        inkLine(g, x, baseY - 40, x + 5, baseY - 8, { width: 1.6, bend: 0.05, seed: seed + 30 + i, alpha: 0.45 });
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

/* ------------------------------------------------------------------ Steine */

export function paintRock(opts) {
  const o = opts || {};
  const scale = o.scale || 1;
  const w = Math.round(124 * scale);
  const h = Math.round(96 * scale);
  const seed = o.seed || 77;
  const cx = w / 2;
  const baseY = h - 12 * scale;

  const body = smoothClosed(blob(cx, baseY - 30 * scale, 44 * scale, 31 * scale, seed, 0.14, 18));
  for (let i = 0; i < body.length; i++) {
    const flat = baseY - 6 * scale;
    if (body[i][1] > flat) body[i][1] = flat + (body[i][1] - flat) * 0.18;
  }
  const moss = smoothClosed(blob(cx - 11 * scale, baseY - 52 * scale, 21 * scale, 9 * scale, seed + 5, 0.28, 12), 4);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 3,
    outline: 2.8 * Math.min(1.2, scale),
    shadow: function (g) { groundShadow(g, cx + 4, baseY - 3, 42 * scale, 11 * scale, seed + 1, 0.15); },
    wash: function (g) {
      wash(g, body, ink.rock, { seed: seed + 2, scale: 1.05 });
      wash(g, offsetShape(body, 13 * scale, 10 * scale, 0.7), ink.rockShade, { seed: seed + 3, alpha: 0.75 });
      if (o.moss !== false) wash(g, moss, ink.moss, { seed: seed + 6, alpha: 0.7 });
      if (o.ore) {
        dot(g, null, cx + 11 * scale, baseY - 34 * scale, 9 * scale, ink.copper, seed + 8);
        dot(g, null, cx - 15 * scale, baseY - 22 * scale, 7 * scale, ink.copper, seed + 11);
      }
    },
    shape: function (g) { fill(g, body); },
    ink: function (g) {
      inkLine(g, cx - 7 * scale, baseY - 55 * scale, cx + 2, baseY - 26 * scale,
        { width: 1.8, bend: 0.16, seed: seed + 21, alpha: 0.55 });
      inkLine(g, cx + 2, baseY - 32 * scale, cx + 21 * scale, baseY - 21 * scale,
        { width: 1.5, bend: -0.12, seed: seed + 22, alpha: 0.42 });
      if (o.ore) {
        dot(null, g, cx + 11 * scale, baseY - 34 * scale, 9 * scale, ink.copper, seed + 8);
        dot(null, g, cx - 15 * scale, baseY - 22 * scale, 7 * scale, ink.copper, seed + 11);
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

/** Geröllhalde – die Sperre in den Klippen. */
export function paintRockslide(opts) {
  const o = opts || {};
  const w = 226;
  const h = 124;
  const seed = o.seed || 181;
  const cx = w / 2;
  const baseY = h - 12;
  const rng = makeRng(seed);

  const chunks = [];
  const spec = [[36, 46, 34, 26], [88, 38, 40, 32], [140, 44, 36, 28], [186, 40, 30, 24], [64, 70, 26, 20], [160, 72, 24, 18]];
  for (let i = 0; i < spec.length; i++) {
    const s = spec[i];
    const pts = smoothClosed(blob(s[0], baseY - s[1], s[2], s[3], seed + i * 5, 0.16, 16));
    for (let k = 0; k < pts.length; k++) {
      const flat = baseY - 4;
      if (pts[k][1] > flat) pts[k][1] = flat + (pts[k][1] - flat) * 0.2;
    }
    chunks.push(pts);
  }

  const res = paintObject(w, h, {
    seed: seed,
    blur: 3.5,
    outline: 3.0,
    shadow: function (g) { groundShadow(g, cx, baseY - 2, 100, 14, seed, 0.16); },
    wash: function (g) {
      for (let i = 0; i < chunks.length; i++) {
        wash(g, chunks[i], ink.rock, { seed: seed + 20 + i, scale: 1.05 });
        wash(g, offsetShape(chunks[i], 12, 9, 0.68), ink.rockShade, { seed: seed + 30 + i, alpha: 0.7 });
      }
      wash(g, smoothClosed(blob(70, baseY - 88, 28, 10, seed + 60, 0.3, 12), 4), ink.moss, { seed: seed + 61, alpha: 0.6 });
      dot(g, null, 150, baseY - 52, 9, ink.copper, seed + 70);
    },
    shape: function (g) { for (let i = 0; i < chunks.length; i++) fill(g, chunks[i]); },
    ink: function (g) {
      for (let i = 0; i < chunks.length; i++) {
        inkStroke(g, chunks[i], { width: 1.8, vary: 0.35, seed: seed + 80 + i, color: ink.line, alpha: 0.45 });
      }
      for (let i = 0; i < 5; i++) {
        const x = 40 + rng() * 150;
        const y = baseY - 20 - rng() * 60;
        inkLine(g, x, y, x + 14 - rng() * 28, y + 10, { width: 1.4, bend: 0.2, seed: seed + 100 + i, alpha: 0.4 });
      }
      dot(null, g, 150, baseY - 52, 9, ink.copper, seed + 70);
    },
  });
  return made(res, w, h, cx, baseY);
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
  for (let i = 0; i < 5; i++) berries.push([cx - 33 + rng() * 66, baseY - 50 + rng() * 32]);

  const lobes = [
    smoothClosed(blob(cx, baseY - 34, 42, 27, seed + 1, 0.18), 6),
    smoothClosed(blob(cx - 27, baseY - 21, 26, 19, seed + 2, 0.2), 6),
    smoothClosed(blob(cx + 28, baseY - 23, 25, 19, seed + 3, 0.2), 6),
  ];

  const res = paintObject(w, h, {
    seed: seed,
    blur: 3,
    outline: 2.7,
    shadow: function (g) { groundShadow(g, cx + 3, baseY - 3, 44, 11, seed + 4, 0.14); },
    wash: function (g) {
      for (let i = 0; i < lobes.length; i++) wash(g, lobes[i], ink.leaf, { seed: seed + 10 + i, scale: 1.05 });
      wash(g, offsetShape(lobes[0], -13, -11, 0.58), ink.leafLight, { seed: seed + 20, alpha: 0.8 });
      wash(g, offsetShape(lobes[0], 12, 11, 0.68), ink.leafDark, { seed: seed + 21, alpha: 0.45 });
      if (o.berries) {
        for (let i = 0; i < berries.length; i++) dot(g, null, berries[i][0], berries[i][1], 6, ink.berry, seed + 40 + i);
      }
    },
    shape: function (g) { for (let i = 0; i < lobes.length; i++) fill(g, lobes[i]); },
    ink: function (g) {
      inkLine(g, cx - 30, baseY - 30, cx - 6, baseY - 40, { width: 1.8, bend: 0.28, seed: seed + 30, alpha: 0.55 });
      inkLine(g, cx + 31, baseY - 31, cx + 8, baseY - 41, { width: 1.8, bend: -0.28, seed: seed + 31, alpha: 0.5 });
      if (o.berries) {
        for (let i = 0; i < berries.length; i++) dot(null, g, berries[i][0], berries[i][1], 6, ink.berry, seed + 40 + i);
      }
    },
  });
  return made(res, w, h, cx, baseY);
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

  const res = paintObject(w, h, {
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
    shape: function (g) { fill(g, stem); fill(g, leaf); fill(g, head); },
    ink: function (g) {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.4;
        inkLine(g, cx + Math.cos(a) * 5, headY + Math.sin(a) * 5,
          cx + Math.cos(a) * 12, headY + Math.sin(a) * 11,
          { width: 1.2, bend: 0.1, seed: seed + 20 + i, alpha: 0.5 });
      }
    },
  });
  return made(res, w, h, cx, baseY);
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
    blades.push({ x: cx - 20 + i * 10 + rng() * 4, top: baseY - 20 - rng() * 20, lean: (rng() - 0.5) * 24 });
  }
  const res = paintObject(w, h, {
    seed: seed,
    blur: 3,
    wash: function (g) {
      wash(g, smoothClosed(blob(cx, baseY - 9, 24, 9, seed + 1, 0.22, 12), 4), ink.grass, { seed: seed + 2, alpha: 0.8 });
    },
    ink: function (g) {
      for (let i = 0; i < blades.length; i++) {
        const b = blades[i];
        inkLine(g, b.x, baseY, b.x + b.lean, b.top, { width: 1.9, bend: 0.24, seed: seed + 10 + i, color: ink.lineSoft });
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

export function paintReeds(opts) {
  const o = opts || {};
  const w = 86;
  const h = 116;
  const seed = o.seed || 191;
  const cx = w / 2;
  const baseY = h - 8;
  const rng = makeRng(seed);
  const stalks = [];
  for (let i = 0; i < 5; i++) {
    stalks.push({
      x: cx - 22 + i * 11 + rng() * 5,
      top: baseY - 52 - rng() * 46,
      lean: (rng() - 0.5) * 22,
      cattail: rng() < 0.6,
    });
  }
  const res = paintObject(w, h, {
    seed: seed,
    blur: 2.5,
    wash: function (g) {
      wash(g, smoothClosed(blob(cx, baseY - 8, 26, 8, seed + 1, 0.22, 12), 4), ink.grassDark, { seed: seed + 2, alpha: 0.7 });
      for (let i = 0; i < stalks.length; i++) {
        const s = stalks[i];
        if (!s.cattail) continue;
        wash(g, smoothClosed(blob(s.x + s.lean, s.top + 8, 5, 13, seed + 10 + i, 0.12, 12), 4),
          ink.barkDark, { seed: seed + 20 + i });
      }
    },
    shape: function (g) {
      for (let i = 0; i < stalks.length; i++) {
        const s = stalks[i];
        if (!s.cattail) continue;
        fill(g, smoothClosed(blob(s.x + s.lean, s.top + 8, 5, 13, seed + 10 + i, 0.12, 12), 4));
      }
    },
    outline: 2.0,
    ink: function (g) {
      for (let i = 0; i < stalks.length; i++) {
        const s = stalks[i];
        inkLine(g, s.x, baseY, s.x + s.lean, s.top, { width: 2.0, bend: 0.14, seed: seed + 30 + i, color: ink.lineSoft });
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

export function paintMushroom(opts) {
  const o = opts || {};
  const w = 62;
  const h = 64;
  const seed = o.seed || 221;
  const cx = w / 2;
  const baseY = h - 8;
  const stem = smoothClosed([[cx - 7, baseY], [cx - 9, baseY - 18], [cx + 9, baseY - 18], [cx + 7, baseY]], 4);
  const cap = smoothClosed(blob(cx, baseY - 26, 22, 15, seed, 0.12, 16), 5);
  for (let i = 0; i < cap.length; i++) {
    if (cap[i][1] > baseY - 20) cap[i][1] = baseY - 20 + (cap[i][1] - (baseY - 20)) * 0.25;
  }
  const res = paintObject(w, h, {
    seed: seed,
    blur: 2.5,
    outline: 2.4,
    shadow: function (g) { groundShadow(g, cx + 2, baseY - 2, 18, 6, seed + 1, 0.13); },
    wash: function (g) {
      wash(g, stem, ink.mushroomStem, { seed: seed + 2 });
      wash(g, cap, ink.mushroomCap, { seed: seed + 3, scale: 1.06 });
      wash(g, offsetShape(cap, 8, 4, 0.55), '#c25344', { seed: seed + 4, alpha: 0.5 });
      dot(g, null, cx - 8, baseY - 30, 4, '#fdf3e2', seed + 5);
      dot(g, null, cx + 7, baseY - 26, 3.4, '#fdf3e2', seed + 6);
    },
    shape: function (g) { fill(g, stem); fill(g, cap); },
    ink: function (g) {
      inkStroke(g, cap, { width: 2.0, vary: 0.3, seed: seed + 10, color: ink.line, alpha: 0.5 });
    },
  });
  return made(res, w, h, cx, baseY);
}

export function paintHerb(opts) {
  const o = opts || {};
  const w = 66;
  const h = 66;
  const seed = o.seed || 241;
  const cx = w / 2;
  const baseY = h - 8;
  const leaves = [
    smoothClosed(blob(cx - 15, baseY - 26, 14, 8, seed + 1, 0.2, 12), 5),
    smoothClosed(blob(cx + 16, baseY - 32, 13, 8, seed + 2, 0.2, 12), 5),
    smoothClosed(blob(cx - 2, baseY - 42, 11, 9, seed + 3, 0.2, 12), 5),
  ];
  const res = paintObject(w, h, {
    seed: seed,
    blur: 2.5,
    outline: 2.2,
    shadow: function (g) { groundShadow(g, cx, baseY - 2, 16, 6, seed, 0.12); },
    wash: function (g) {
      for (let i = 0; i < leaves.length; i++) wash(g, leaves[i], ink.leafDark, { seed: seed + 10 + i, scale: 1.06 });
      wash(g, offsetShape(leaves[2], -4, -3, 0.7), ink.leafLight, { seed: seed + 20, alpha: 0.7 });
    },
    shape: function (g) { for (let i = 0; i < leaves.length; i++) fill(g, leaves[i]); },
    ink: function (g) {
      inkLine(g, cx, baseY, cx - 1, baseY - 40, { width: 1.8, bend: 0.06, seed: seed + 30, color: ink.lineSoft });
      for (let i = 0; i < leaves.length; i++) {
        inkStroke(g, leaves[i], { width: 1.3, vary: 0.3, seed: seed + 40 + i, color: ink.line, alpha: 0.35 });
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

export function paintShell(opts) {
  const o = opts || {};
  const w = 64;
  const h = 50;
  const seed = o.seed || 261;
  const cx = w / 2;
  const baseY = h - 8;
  const body = smoothClosed([
    [cx - 22, baseY], [cx - 18, baseY - 16], [cx - 8, baseY - 28],
    [cx + 6, baseY - 28], [cx + 18, baseY - 15], [cx + 22, baseY],
  ], 6);
  const res = paintObject(w, h, {
    seed: seed,
    blur: 2,
    outline: 2.2,
    shadow: function (g) { groundShadow(g, cx + 2, baseY - 1, 20, 5, seed, 0.12); },
    wash: function (g) {
      wash(g, body, '#f7e6d4', { seed: seed + 2, scale: 1.05 });
      wash(g, offsetShape(body, 6, 3, 0.6), '#e6c8ad', { seed: seed + 3, alpha: 0.6 });
    },
    shape: function (g) { fill(g, body); },
    ink: function (g) {
      for (let i = -2; i <= 2; i++) {
        inkLine(g, cx + i * 2, baseY - 26, cx + i * 9, baseY - 2,
          { width: 1.4, bend: 0.05, seed: seed + 10 + i, alpha: 0.5 });
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

export function paintDriftwood(opts) {
  const o = opts || {};
  const w = 104;
  const h = 54;
  const seed = o.seed || 281;
  const cx = w / 2;
  const baseY = h - 10;
  const body = smoothClosed([
    [12, baseY - 4], [18, baseY - 18], [46, baseY - 22],
    [70, baseY - 14], [92, baseY - 18], [96, baseY - 6], [66, baseY - 2], [30, baseY],
  ], 6);
  const res = paintObject(w, h, {
    seed: seed,
    blur: 2.5,
    outline: 2.4,
    shadow: function (g) { groundShadow(g, cx, baseY - 1, 40, 7, seed, 0.13); },
    wash: function (g) {
      wash(g, body, '#ddd0b8', { seed: seed + 2, scale: 1.04 });
      wash(g, offsetShape(body, 4, 6, 0.75), '#bfae92', { seed: seed + 3, alpha: 0.6 });
    },
    shape: function (g) { fill(g, body); },
    ink: function (g) {
      inkLine(g, 24, baseY - 12, 88, baseY - 12, { width: 1.4, bend: 0.05, seed: seed + 10, alpha: 0.45 });
      inkLine(g, 40, baseY - 18, 62, baseY - 6, { width: 1.2, bend: 0.1, seed: seed + 11, alpha: 0.35 });
    },
  });
  return made(res, w, h, cx, baseY);
}

/** Grabstelle: aufgeworfene Erde mit kleiner Schaufelspur. */
export function paintDigspot(opts) {
  const o = opts || {};
  const w = 92;
  const h = 52;
  const seed = o.seed || 301;
  const cx = w / 2;
  const baseY = h - 10;
  const pit = smoothClosed(blob(cx, baseY - 10, 30, 12, seed, 0.2, 16), 5);
  const mound = smoothClosed(blob(cx + 18, baseY - 18, 16, 8, seed + 2, 0.26, 14), 5);
  const res = paintObject(w, h, {
    seed: seed,
    blur: 3,
    outline: 2.6,
    wash: function (g) {
      wash(g, pit, ink.dirtDark, { seed: seed + 3, scale: 1.06 });
      wash(g, offsetShape(pit, 0, 2, 0.7), '#7d6540', { seed: seed + 4, alpha: 0.8 });
      wash(g, mound, ink.dirt, { seed: seed + 5 });
    },
    shape: function (g) { fill(g, pit); fill(g, mound); },
    ink: function (g) {
      inkLine(g, cx - 12, baseY - 12, cx + 6, baseY - 8, { width: 1.4, bend: 0.2, seed: seed + 10, alpha: 0.45 });
      inkLine(g, cx - 4, baseY - 16, cx + 10, baseY - 14, { width: 1.2, bend: -0.15, seed: seed + 11, alpha: 0.35 });
    },
  });
  return made(res, w, h, cx, baseY);
}
