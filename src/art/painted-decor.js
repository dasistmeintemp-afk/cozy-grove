/**
 * Deko zum Einrichten.
 *
 * Eigene Datei, weil `painted-camp.js` sonst alles wäre: Dort stehen die
 * Bauten, die zum Lager gehören, hier das, was man selbst hinstellt.
 *
 * Zwei Regeln aus dem Hausbau gelten auch hier:
 *
 * 1. **Was Ecken hat, entsteht mit `slab` oder `poly`.** Vier Punkte durch
 *    eine Catmull-Rom-Kurve ergeben einen Laib – Tischplatten, Bretter und
 *    Pfosten dürfen das nicht.
 * 2. **Was flach am Boden liegt, hat seinen Fußpunkt in der Mitte** und wird
 *    im Spiel als `flat` geführt. Der Renderer zeichnet Flaches vor allem
 *    Aufrechten; nach der Tiefe einsortiert läge es sonst über der Figur.
 */
import {
  blob, smoothClosed, offsetShape, inkStroke, inkLine, wash,
  paintObject, groundShadow,
} from './brush.js';
import { INK as ink, fill, made, dot, slab, poly, quad } from './painted.js';
import { makeRng } from '../core/rng.js';

/* ------------------------------------------------------------ Sitzen & Wohnen */

export function paintTable(opts) {
  const o = opts || {};
  const w = 212;
  const h = 156;
  const seed = o.seed || 1201;
  const cx = w / 2;
  const baseY = h - 12;

  // Platte in zwei Flächen: Aufsicht und Kante. Als ein Kasten läse sie sich
  // wie ein Brett auf Stelzen, nicht wie ein Tisch.
  const topY = baseY - 76;
  const platte = poly([
    [cx - 84, topY + 4], [cx - 72, topY - 10], [cx + 72, topY - 10], [cx + 84, topY + 4],
  ], 3);
  const kante = slab(cx - 84, topY + 2, cx + 84, topY + 16, seed + 1, 1.4);
  const beine = [
    slab(cx - 66, topY + 14, cx - 52, baseY - 2, seed + 2, 1.2),
    slab(cx + 52, topY + 14, cx + 66, baseY - 2, seed + 3, 1.2),
  ];
  const strebe = slab(cx - 60, baseY - 34, cx + 60, baseY - 24, seed + 4, 1.2);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.5,
    outline: 1.8,
    shadow: function (g) { groundShadow(g, cx, baseY - 3, 88, 14, seed, 0.15); },
    wash: function (g) {
      for (let i = 0; i < beine.length; i++) wash(g, beine[i], ink.woodDark, { seed: seed + 10 + i });
      wash(g, strebe, ink.woodDark, { seed: seed + 12 });
      wash(g, kante, ink.woodDark, { seed: seed + 13 });
      wash(g, platte, ink.wood, { seed: seed + 14, scale: 1.02 });
      wash(g, offsetShape(platte, 30, 4, 0.6), '#c9a87e', { seed: seed + 15, alpha: 0.5 });
    },
    shape: function (g) {
      for (let i = 0; i < beine.length; i++) fill(g, beine[i]);
      fill(g, strebe);
      fill(g, kante);
      fill(g, platte);
    },
    ink: function (g) {
      inkStroke(g, platte, { width: 2.2, vary: 0.3, seed: seed + 20, color: ink.line, alpha: 0.7 });
      for (let i = 1; i < 4; i++) {
        const x = cx - 72 + (144 / 4) * i;
        inkLine(g, x, topY - 8, x, topY + 3,
          { width: 1.3, bend: 0.03, seed: seed + 22 + i, color: ink.lineSoft, alpha: 0.45 });
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

export function paintChair(opts) {
  const o = opts || {};
  const w = 132;
  const h = 168;
  const seed = o.seed || 1211;
  const cx = w / 2;
  const baseY = h - 10;

  const sitzY = baseY - 62;
  const sitz = poly([
    [cx - 40, sitzY + 3], [cx - 34, sitzY - 8], [cx + 34, sitzY - 8], [cx + 40, sitzY + 3],
  ], 3);
  const kante = slab(cx - 40, sitzY + 2, cx + 40, sitzY + 13, seed + 1, 1.2);
  const beine = [
    slab(cx - 34, sitzY + 11, cx - 24, baseY - 2, seed + 2, 1.1),
    slab(cx + 24, sitzY + 11, cx + 34, baseY - 2, seed + 3, 1.1),
  ];
  const lehneL = slab(cx - 34, baseY - 132, cx - 24, sitzY, seed + 4, 1.1);
  const lehneR = slab(cx + 24, baseY - 132, cx + 34, sitzY, seed + 5, 1.1);
  const sprossen = [
    slab(cx - 32, baseY - 128, cx + 32, baseY - 116, seed + 6, 1.1),
    slab(cx - 32, baseY - 104, cx + 32, baseY - 92, seed + 7, 1.1),
  ];

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.4,
    outline: 1.8,
    shadow: function (g) { groundShadow(g, cx, baseY - 3, 42, 10, seed, 0.15); },
    wash: function (g) {
      for (let i = 0; i < beine.length; i++) wash(g, beine[i], ink.woodDark, { seed: seed + 10 + i });
      wash(g, lehneL, ink.woodDark, { seed: seed + 13 });
      wash(g, lehneR, ink.woodDark, { seed: seed + 14 });
      for (let i = 0; i < sprossen.length; i++) wash(g, sprossen[i], ink.wood, { seed: seed + 15 + i });
      wash(g, kante, ink.woodDark, { seed: seed + 18 });
      wash(g, sitz, ink.wood, { seed: seed + 19, scale: 1.02 });
    },
    shape: function (g) {
      for (let i = 0; i < beine.length; i++) fill(g, beine[i]);
      fill(g, lehneL); fill(g, lehneR);
      for (let i = 0; i < sprossen.length; i++) fill(g, sprossen[i]);
      fill(g, kante); fill(g, sitz);
    },
    ink: function (g) {
      inkStroke(g, sitz, { width: 2.0, vary: 0.3, seed: seed + 22, color: ink.line, alpha: 0.65 });
      for (let i = 0; i < sprossen.length; i++) {
        inkStroke(g, sprossen[i], { width: 1.6, vary: 0.3, seed: seed + 24 + i, color: ink.line, alpha: 0.5 });
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

export function paintHammock(opts) {
  const o = opts || {};
  const w = 296;
  const h = 190;
  const seed = o.seed || 1221;
  const cx = w / 2;
  const baseY = h - 10;

  const pfostenL = slab(cx - 122, baseY - 132, cx - 106, baseY - 2, seed + 1, 1.3);
  const pfostenR = slab(cx + 106, baseY - 132, cx + 122, baseY - 2, seed + 2, 1.3);
  // Das Tuch hängt durch: oben die Aufhängungen, unten der Bauch.
  const tuch = smoothClosed([
    [cx - 108, baseY - 122], [cx - 60, baseY - 92], [cx, baseY - 78],
    [cx + 60, baseY - 92], [cx + 108, baseY - 122],
    [cx + 66, baseY - 58], [cx, baseY - 44], [cx - 66, baseY - 58],
  ], 5);
  const kissen = smoothClosed(blob(cx - 62, baseY - 74, 24, 15, seed + 3, 0.1, 12), 5);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.6,
    outline: 1.8,
    shadow: function (g) { groundShadow(g, cx, baseY - 3, 118, 15, seed, 0.14); },
    wash: function (g) {
      wash(g, pfostenL, ink.woodDark, { seed: seed + 10 });
      wash(g, pfostenR, ink.woodDark, { seed: seed + 11 });
      wash(g, tuch, '#d9a97e', { seed: seed + 12, scale: 1.02 });
      wash(g, offsetShape(tuch, 0, 16, 0.8), '#b8845c', { seed: seed + 13, alpha: 0.5 });
      wash(g, kissen, '#8fb0bd', { seed: seed + 14, scale: 1.04 });
    },
    shape: function (g) { fill(g, pfostenL); fill(g, pfostenR); fill(g, tuch); },
    ink: function (g) {
      // Streifen im Tuch, der Wölbung folgend
      for (let i = 1; i < 6; i++) {
        const t = i / 6;
        const x = cx - 100 + 200 * t;
        const durch = Math.sin(t * Math.PI) * 22;
        inkLine(g, x, baseY - 118 + durch, x, baseY - 52 + durch,
          { width: 1.4, bend: 0.05, seed: seed + 20 + i, color: ink.lineSoft, alpha: 0.45 });
      }
      inkStroke(g, kissen, { width: 1.8, vary: 0.3, seed: seed + 30, color: ink.line, alpha: 0.7 });
      // Die Schnüre zu den Pfosten
      inkLine(g, cx - 114, baseY - 126, cx - 104, baseY - 118,
        { width: 1.6, bend: 0.1, seed: seed + 31, alpha: 0.7 });
      inkLine(g, cx + 114, baseY - 126, cx + 104, baseY - 118,
        { width: 1.6, bend: -0.1, seed: seed + 32, alpha: 0.7 });
    },
  });
  return made(res, w, h, cx, baseY);
}

export function paintSwing(opts) {
  const o = opts || {};
  const w = 216;
  const h = 232;
  const seed = o.seed || 1231;
  const cx = w / 2;
  const baseY = h - 10;

  const balken = slab(cx - 86, baseY - 196, cx + 86, baseY - 180, seed + 1, 1.4);
  const beinL = poly([
    [cx - 84, baseY - 190], [cx - 68, baseY - 190], [cx - 34, baseY - 2], [cx - 50, baseY - 2],
  ], 2);
  const beinR = poly([
    [cx + 68, baseY - 190], [cx + 84, baseY - 190], [cx + 50, baseY - 2], [cx + 34, baseY - 2],
  ], 2);
  // Das Brett hängt auf halber Höhe. Tiefer gehängt las es sich als unterste
  // Sprosse des Gestells statt als Sitz.
  const brett = slab(cx - 42, baseY - 100, cx + 42, baseY - 86, seed + 4, 1.2);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.5,
    outline: 1.8,
    shadow: function (g) { groundShadow(g, cx, baseY - 3, 76, 13, seed, 0.15); },
    wash: function (g) {
      wash(g, beinL, ink.woodDark, { seed: seed + 10 });
      wash(g, beinR, ink.woodDark, { seed: seed + 11 });
      wash(g, balken, ink.wood, { seed: seed + 12 });
      wash(g, offsetShape(balken, 0, 8, 0.8), ink.woodDark, { seed: seed + 13, alpha: 0.5 });
      wash(g, brett, ink.wood, { seed: seed + 14, scale: 1.03 });
    },
    shape: function (g) { fill(g, beinL); fill(g, beinR); fill(g, balken); fill(g, brett); },
    ink: function (g) {
      // Kräftige Seile: dünn gezeichnet verschwanden sie, und der Sitz sah
      // aus, als schwebe er.
      inkLine(g, cx - 36, baseY - 180, cx - 36, baseY - 94,
        { width: 3.0, bend: 0.03, seed: seed + 20, alpha: 0.9 });
      inkLine(g, cx + 36, baseY - 180, cx + 36, baseY - 94,
        { width: 3.0, bend: -0.03, seed: seed + 21, alpha: 0.9 });
      inkStroke(g, brett, { width: 2.2, vary: 0.3, seed: seed + 22, color: ink.line, alpha: 0.8 });
    },
  });
  return made(res, w, h, cx, baseY);
}

/* ------------------------------------------------------------------- Licht */

export function paintFirebowl(opts) {
  const o = opts || {};
  const w = 176;
  const h = 148;
  const seed = o.seed || 1241;
  const cx = w / 2;
  const baseY = h - 10;

  const schale = smoothClosed([
    [cx - 58, baseY - 62], [cx + 58, baseY - 62],
    [cx + 40, baseY - 28], [cx, baseY - 20], [cx - 40, baseY - 28],
  ], 5);
  const fuss = slab(cx - 14, baseY - 30, cx + 14, baseY - 2, seed + 1, 1.2);
  const teller = smoothClosed(blob(cx, baseY - 4, 34, 9, seed + 2, 0.1, 14), 5);
  const glut = smoothClosed(blob(cx, baseY - 58, 44, 12, seed + 3, 0.15, 14), 5);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.6,
    outline: 1.8,
    shadow: function (g) { groundShadow(g, cx, baseY - 3, 52, 12, seed, 0.16); },
    wash: function (g) {
      wash(g, teller, '#9aa0a6', { seed: seed + 10 });
      wash(g, fuss, '#8e949a', { seed: seed + 11 });
      wash(g, schale, '#a7adb3', { seed: seed + 12, scale: 1.02 });
      wash(g, offsetShape(schale, 22, 6, 0.62), '#7d848a', { seed: seed + 13, alpha: 0.6 });
      wash(g, glut, '#e8863c', { seed: seed + 14, scale: 1.05 });
      wash(g, offsetShape(glut, 0, -4, 0.55), '#f7d07a', { seed: seed + 15, alpha: 0.85 });
    },
    shape: function (g) { fill(g, teller); fill(g, fuss); fill(g, schale); },
    ink: function (g) {
      inkStroke(g, schale, { width: 2.2, vary: 0.3, seed: seed + 20, color: ink.line, alpha: 0.75 });
      inkLine(g, cx - 54, baseY - 58, cx + 54, baseY - 58,
        { width: 1.8, bend: 0.04, seed: seed + 21, color: ink.line, alpha: 0.6 });
      // Ein paar Scheite, die aus der Glut ragen
      const rng = makeRng((seed + 40) >>> 0);
      for (let i = 0; i < 4; i++) {
        const x = cx - 26 + i * 17 + (rng() - 0.5) * 6;
        inkLine(g, x, baseY - 54, x + (rng() - 0.5) * 16, baseY - 72,
          { width: 2.0, bend: 0.06, seed: seed + 42 + i, color: ink.line, alpha: 0.7 });
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

export function paintStringlights(opts) {
  const o = opts || {};
  const w = 300;
  const h = 178;
  const seed = o.seed || 1251;
  const cx = w / 2;
  const baseY = h - 10;

  const pfostenL = slab(cx - 128, baseY - 148, cx - 114, baseY - 2, seed + 1, 1.3);
  const pfostenR = slab(cx + 114, baseY - 148, cx + 128, baseY - 2, seed + 2, 1.3);
  // Die Kette hängt als Kettenlinie durch, sonst liest sie sich als Stange.
  const punkte = [];
  const N = 9;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = cx - 118 + 236 * t;
    const y = baseY - 142 + Math.sin(t * Math.PI) * 46;
    punkte.push([x, y]);
  }
  const lampen = punkte.slice(1, N).map(function (p, i) {
    return smoothClosed(blob(p[0], p[1] + 13, 10, 12, seed + 10 + i, 0.1, 10), 5);
  });

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.5,
    outline: 1.7,
    shadow: function (g) { groundShadow(g, cx, baseY - 3, 128, 12, seed, 0.12); },
    wash: function (g) {
      wash(g, pfostenL, ink.woodDark, { seed: seed + 30 });
      wash(g, pfostenR, ink.woodDark, { seed: seed + 31 });
      for (let i = 0; i < lampen.length; i++) {
        wash(g, lampen[i], i % 2 ? '#f7d98c' : '#f2b06a', { seed: seed + 40 + i, scale: 1.05 });
      }
    },
    shape: function (g) {
      fill(g, pfostenL);
      fill(g, pfostenR);
      for (let i = 0; i < lampen.length; i++) fill(g, lampen[i]);
    },
    ink: function (g) {
      for (let i = 0; i < punkte.length - 1; i++) {
        inkLine(g, punkte[i][0], punkte[i][1], punkte[i + 1][0], punkte[i + 1][1],
          { width: 1.6, bend: 0.02, seed: seed + 50 + i, color: ink.line, alpha: 0.8 });
      }
      for (let i = 0; i < lampen.length; i++) {
        inkStroke(g, lampen[i], { width: 1.5, vary: 0.3, seed: seed + 60 + i, color: ink.line, alpha: 0.75 });
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

export function paintPaperlamp(opts) {
  const o = opts || {};
  const w = 132;
  const h = 208;
  const seed = o.seed || 1261;
  const cx = w / 2;
  const baseY = h - 10;

  const stange = slab(cx - 7, baseY - 176, cx + 7, baseY - 2, seed + 1, 1.2);
  const arm = slab(cx - 4, baseY - 176, cx + 40, baseY - 166, seed + 2, 1.2);
  const lampion = smoothClosed(blob(cx + 34, baseY - 122, 34, 38, seed + 3, 0.06, 20), 6);
  const deckel = slab(cx + 20, baseY - 162, cx + 48, baseY - 152, seed + 4, 1.1);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.6,
    outline: 1.8,
    shadow: function (g) { groundShadow(g, cx, baseY - 3, 26, 8, seed, 0.15); },
    wash: function (g) {
      wash(g, stange, ink.woodDark, { seed: seed + 10 });
      wash(g, arm, ink.woodDark, { seed: seed + 11 });
      wash(g, lampion, '#f4d9a2', { seed: seed + 12, scale: 1.03 });
      wash(g, offsetShape(lampion, 16, 6, 0.62), '#e6bc79', { seed: seed + 13, alpha: 0.55 });
      wash(g, deckel, '#c0623f', { seed: seed + 14 });
    },
    shape: function (g) { fill(g, stange); fill(g, arm); fill(g, deckel); fill(g, lampion); },
    ink: function (g) {
      inkStroke(g, lampion, { width: 2.0, vary: 0.28, seed: seed + 20, color: ink.line, alpha: 0.8 });
      // Rippen, dem Bauch folgend
      for (let i = 1; i <= 3; i++) {
        const t = i / 4;
        const x = cx + 34 - 34 + 68 * t;
        const r = Math.sin(t * Math.PI) * 36;
        inkLine(g, x, baseY - 122 - r, x, baseY - 122 + r,
          { width: 1.3, bend: 0.03, seed: seed + 22 + i, color: ink.lineSoft, alpha: 0.5 });
      }
      inkLine(g, cx + 20, baseY - 84, cx + 48, baseY - 84,
        { width: 1.4, bend: 0.05, seed: seed + 28, color: ink.lineSoft, alpha: 0.45 });
    },
  });
  return made(res, w, h, cx, baseY);
}

/* ------------------------------------------------------------------ Garten */

export function paintPlanter(opts) {
  const o = opts || {};
  const w = 156;
  const h = 168;
  const seed = o.seed || 1271;
  const cx = w / 2;
  const baseY = h - 10;

  const kuebel = poly([
    [cx - 46, baseY - 78], [cx + 46, baseY - 78],
    [cx + 34, baseY - 2], [cx - 34, baseY - 2],
  ], 3);
  const rand = slab(cx - 50, baseY - 84, cx + 50, baseY - 70, seed + 1, 1.3);
  const erde = smoothClosed(blob(cx, baseY - 78, 42, 10, seed + 2, 0.1, 14), 5);
  const busch = [
    smoothClosed(blob(cx - 20, baseY - 106, 28, 24, seed + 3, 0.16, 16), 5),
    smoothClosed(blob(cx + 18, baseY - 100, 26, 22, seed + 4, 0.16, 16), 5),
    smoothClosed(blob(cx, baseY - 126, 24, 22, seed + 5, 0.16, 16), 5),
  ];

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.6,
    outline: 1.8,
    shadow: function (g) { groundShadow(g, cx, baseY - 3, 46, 11, seed, 0.15); },
    wash: function (g) {
      wash(g, kuebel, '#c98d63', { seed: seed + 10, scale: 1.02 });
      wash(g, offsetShape(kuebel, 22, 6, 0.6), '#a06f4c', { seed: seed + 11, alpha: 0.6 });
      wash(g, rand, '#d79b70', { seed: seed + 12 });
      wash(g, erde, '#6f5940', { seed: seed + 13 });
      for (let i = 0; i < busch.length; i++) {
        wash(g, busch[i], i === 2 ? ink.leafLight : ink.leaf, { seed: seed + 14 + i, scale: 1.03 });
      }
    },
    shape: function (g) {
      fill(g, kuebel); fill(g, rand);
      for (let i = 0; i < busch.length; i++) fill(g, busch[i]);
    },
    ink: function (g) {
      inkStroke(g, rand, { width: 2.0, vary: 0.3, seed: seed + 20, color: ink.line, alpha: 0.7 });
      for (let i = 1; i < 4; i++) {
        const x = cx - 40 + (80 / 4) * i;
        inkLine(g, x, baseY - 66, x - (x - cx) * 0.18, baseY - 8,
          { width: 1.3, bend: 0.03, seed: seed + 22 + i, color: ink.lineSoft, alpha: 0.4 });
      }
      // Ein paar Blüten im Grün
      const rng = makeRng((seed + 60) >>> 0);
      for (let i = 0; i < 5; i++) {
        dot(null, g, cx - 26 + rng() * 52, baseY - 136 + rng() * 44, 4.2, ink.line, seed + 62 + i);
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

export function paintTrellis(opts) {
  const o = opts || {};
  const w = 172;
  const h = 236;
  const seed = o.seed || 1281;
  const cx = w / 2;
  const baseY = h - 10;

  const pfostenL = slab(cx - 56, baseY - 200, cx - 44, baseY - 2, seed + 1, 1.2);
  const pfostenR = slab(cx + 44, baseY - 200, cx + 56, baseY - 2, seed + 2, 1.2);
  const bogen = smoothClosed([
    [cx - 56, baseY - 190], [cx - 30, baseY - 214], [cx + 30, baseY - 214], [cx + 56, baseY - 190],
    [cx + 44, baseY - 188], [cx, baseY - 202], [cx - 44, baseY - 188],
  ], 4);
  const sprossen = [];
  for (let i = 0; i < 4; i++) {
    const y = baseY - 168 + i * 40;
    sprossen.push(slab(cx - 52, y, cx + 52, y + 9, seed + 10 + i, 1.1));
  }
  // Die Ranke klettert am Rahmen hoch, statt in der Mitte zu schweben:
  // verstreute Blätter lasen sich als Krempel auf einem Regal, nicht als
  // Pflanze. Links außen hoch, über den Bogen, rechts ein Stück herunter.
  const ranken = [];
  const rng = makeRng((seed + 30) >>> 0);
  const bahn = [];
  for (let i = 0; i <= 7; i++) {
    const t = i / 7;
    bahn.push([cx - 50 + Math.sin(t * 2.4) * 12, baseY - 12 - t * 182]);
  }
  for (let i = 0; i <= 5; i++) {
    const t = i / 5;
    bahn.push([cx - 34 + t * 78, baseY - 200 - Math.sin(t * Math.PI) * 14]);
  }
  for (let i = 1; i <= 3; i++) {
    const t = i / 3;
    bahn.push([cx + 48 - Math.sin(t * 2) * 10, baseY - 196 + t * 78]);
  }
  for (let i = 0; i < bahn.length; i++) {
    const p = bahn[i];
    ranken.push(smoothClosed(blob(
      p[0] + (rng() - 0.5) * 10, p[1] + (rng() - 0.5) * 10,
      12 + rng() * 7, 10 + rng() * 5, seed + 40 + i, 0.24, 12), 5));
  }

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.6,
    outline: 1.7,
    shadow: function (g) { groundShadow(g, cx, baseY - 3, 56, 11, seed, 0.14); },
    wash: function (g) {
      wash(g, pfostenL, ink.wood, { seed: seed + 50 });
      wash(g, pfostenR, ink.wood, { seed: seed + 51 });
      wash(g, bogen, ink.wood, { seed: seed + 52 });
      for (let i = 0; i < sprossen.length; i++) {
        wash(g, sprossen[i], ink.woodDark, { seed: seed + 53 + i });
      }
      for (let i = 0; i < ranken.length; i++) {
        wash(g, ranken[i], i % 3 === 0 ? ink.leafLight : ink.leaf, { seed: seed + 60 + i, scale: 1.04 });
      }
    },
    shape: function (g) {
      fill(g, pfostenL); fill(g, pfostenR); fill(g, bogen);
      for (let i = 0; i < sprossen.length; i++) fill(g, sprossen[i]);
      for (let i = 0; i < ranken.length; i++) fill(g, ranken[i]);
    },
    ink: function (g) {
      for (let i = 0; i < sprossen.length; i++) {
        inkStroke(g, sprossen[i], { width: 1.4, vary: 0.3, seed: seed + 70 + i, color: ink.line, alpha: 0.5 });
      }
      // Der Trieb selbst als durchgehende Linie – ohne ihn wären es nur
      // aufgereihte Blätter.
      for (let i = 0; i < bahn.length - 1; i++) {
        inkLine(g, bahn[i][0], bahn[i][1], bahn[i + 1][0], bahn[i + 1][1],
          { width: 1.6, bend: 0.12, seed: seed + 78 + i, color: ink.leafDeep, alpha: 0.7 });
      }
      // Ein paar Blüten auf dem Trieb
      for (let i = 2; i < bahn.length; i += 4) {
        dot(null, g, bahn[i][0] + 6, bahn[i][1] - 4, 4.6, ink.line, seed + 90 + i);
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

export function paintBirdbath(opts) {
  const o = opts || {};
  const w = 152;
  const h = 178;
  const seed = o.seed || 1291;
  const cx = w / 2;
  const baseY = h - 10;

  const sockel = smoothClosed(blob(cx, baseY - 8, 34, 11, seed + 1, 0.09, 14), 5);
  const saeule = poly([
    [cx - 14, baseY - 116], [cx + 14, baseY - 116], [cx + 22, baseY - 12], [cx - 22, baseY - 12],
  ], 3);
  const becken = smoothClosed([
    [cx - 50, baseY - 132], [cx + 50, baseY - 132],
    [cx + 34, baseY - 108], [cx, baseY - 102], [cx - 34, baseY - 108],
  ], 5);
  const wasser = smoothClosed(blob(cx, baseY - 128, 40, 11, seed + 2, 0.08, 16), 5);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.6,
    outline: 1.8,
    shadow: function (g) { groundShadow(g, cx, baseY - 3, 38, 10, seed, 0.15); },
    wash: function (g) {
      wash(g, sockel, '#b9b2a4', { seed: seed + 10 });
      wash(g, saeule, '#c6bfb0', { seed: seed + 11, scale: 1.02 });
      wash(g, offsetShape(saeule, 10, 4, 0.55), '#9d9689', { seed: seed + 12, alpha: 0.6 });
      wash(g, becken, '#cdc6b7', { seed: seed + 13, scale: 1.02 });
      wash(g, wasser, '#8fb8c9', { seed: seed + 14, scale: 1.03 });
      wash(g, offsetShape(wasser, -8, -2, 0.5), '#b6d7e2', { seed: seed + 15, alpha: 0.7 });
    },
    shape: function (g) { fill(g, sockel); fill(g, saeule); fill(g, becken); },
    ink: function (g) {
      inkStroke(g, becken, { width: 2.2, vary: 0.3, seed: seed + 20, color: ink.line, alpha: 0.75 });
      inkStroke(g, wasser, { width: 1.6, vary: 0.3, seed: seed + 21, color: ink.line, alpha: 0.45 });
      // Zwei Kringel auf dem Wasser
      inkLine(g, cx - 16, baseY - 128, cx + 4, baseY - 130,
        { width: 1.3, bend: 0.4, seed: seed + 22, color: ink.lineSoft, alpha: 0.5 });
      inkLine(g, cx + 8, baseY - 125, cx + 24, baseY - 127,
        { width: 1.2, bend: 0.4, seed: seed + 23, color: ink.lineSoft, alpha: 0.45 });
    },
  });
  return made(res, w, h, cx, baseY);
}

export function paintBeehive(opts) {
  const o = opts || {};
  const w = 148;
  const h = 168;
  const seed = o.seed || 1301;
  const cx = w / 2;
  const baseY = h - 10;

  const brett = slab(cx - 46, baseY - 16, cx + 46, baseY - 2, seed + 1, 1.3);
  // Der Korb aus vier Ringen, nach oben schmaler – ein einzelner Kasten läse
  // sich als Fass.
  const ringe = [];
  for (let i = 0; i < 4; i++) {
    const rr = 46 - i * 8;
    const y = baseY - 30 - i * 26;
    ringe.push(smoothClosed(blob(cx, y, rr, 17, seed + 4 + i, 0.06, 16), 6));
  }
  const kuppe = smoothClosed(blob(cx, baseY - 132, 18, 12, seed + 9, 0.1, 12), 6);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.6,
    outline: 1.8,
    shadow: function (g) { groundShadow(g, cx, baseY - 3, 50, 12, seed, 0.15); },
    wash: function (g) {
      wash(g, brett, ink.woodDark, { seed: seed + 10 });
      for (let i = 0; i < ringe.length; i++) {
        wash(g, ringe[i], i % 2 ? '#e0b465' : '#d3a352', { seed: seed + 12 + i, scale: 1.02 });
      }
      wash(g, kuppe, '#d3a352', { seed: seed + 18 });
      wash(g, offsetShape(ringe[0], 24, 4, 0.6), '#b0842f', { seed: seed + 19, alpha: 0.45 });
    },
    shape: function (g) {
      fill(g, brett);
      for (let i = 0; i < ringe.length; i++) fill(g, ringe[i]);
      fill(g, kuppe);
    },
    ink: function (g) {
      for (let i = 0; i < ringe.length; i++) {
        inkStroke(g, ringe[i], { width: 1.6, vary: 0.3, seed: seed + 20 + i, color: ink.line, alpha: 0.55 });
      }
      // Das Flugloch – ohne es ist es ein gestapelter Kuchen
      dot(null, g, cx, baseY - 34, 7, ink.line, seed + 30);
      const rng = makeRng((seed + 40) >>> 0);
      for (let i = 0; i < 3; i++) {
        const x = cx + 28 + rng() * 26;
        const y = baseY - 96 - rng() * 40;
        inkLine(g, x - 4, y, x + 4, y, { width: 1.4, bend: 0.5, seed: seed + 42 + i, alpha: 0.7 });
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

export function paintScarecrow(opts) {
  const o = opts || {};
  const w = 168;
  const h = 244;
  const seed = o.seed || 1311;
  const cx = w / 2;
  const baseY = h - 10;

  const pfahl = slab(cx - 8, baseY - 200, cx + 8, baseY - 2, seed + 1, 1.2);
  const arme = slab(cx - 62, baseY - 152, cx + 62, baseY - 140, seed + 2, 1.3);
  const hemd = poly([
    [cx - 40, baseY - 158], [cx + 40, baseY - 158],
    [cx + 30, baseY - 74], [cx - 30, baseY - 74],
  ], 3);
  const kopf = smoothClosed(blob(cx, baseY - 184, 28, 26, seed + 3, 0.09, 16), 6);
  const hutrand = smoothClosed(blob(cx, baseY - 202, 42, 11, seed + 4, 0.08, 16), 5);
  const hut = smoothClosed([
    [cx - 24, baseY - 204], [cx - 16, baseY - 232], [cx + 16, baseY - 232], [cx + 24, baseY - 204],
  ], 4);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.6,
    outline: 1.8,
    shadow: function (g) { groundShadow(g, cx, baseY - 3, 40, 11, seed, 0.15); },
    wash: function (g) {
      wash(g, pfahl, ink.woodDark, { seed: seed + 10 });
      wash(g, arme, ink.woodDark, { seed: seed + 11 });
      wash(g, hemd, '#a8c1d0', { seed: seed + 12, scale: 1.02 });
      wash(g, offsetShape(hemd, 22, 6, 0.6), '#7f9cae', { seed: seed + 13, alpha: 0.55 });
      wash(g, kopf, '#e2c88d', { seed: seed + 14, scale: 1.03 });
      wash(g, hutrand, '#c08a4e', { seed: seed + 15 });
      wash(g, hut, '#c08a4e', { seed: seed + 16 });
    },
    shape: function (g) {
      fill(g, pfahl); fill(g, arme); fill(g, hemd); fill(g, kopf); fill(g, hutrand); fill(g, hut);
    },
    ink: function (g) {
      inkStroke(g, hemd, { width: 2.0, vary: 0.3, seed: seed + 20, color: ink.line, alpha: 0.6 });
      dot(null, g, cx - 9, baseY - 188, 3.4, ink.line, seed + 22);
      dot(null, g, cx + 9, baseY - 188, 3.4, ink.line, seed + 23);
      inkLine(g, cx - 7, baseY - 176, cx + 7, baseY - 176,
        { width: 1.6, bend: 0.35, seed: seed + 24, alpha: 0.75 });
      // Stroh an Ärmeln und Saum
      const rng = makeRng((seed + 50) >>> 0);
      for (let i = 0; i < 8; i++) {
        const links = i < 4;
        const x = links ? cx - 58 + rng() * 8 : cx + 50 + rng() * 8;
        const y = baseY - 140 + rng() * 8;
        inkLine(g, x, y, x + (links ? -9 : 9), y + 9,
          { width: 1.3, bend: 0.06, seed: seed + 52 + i, color: ink.lineSoft, alpha: 0.6 });
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

/* ---------------------------------------------------------------- Sonstiges */

export function paintWeathervane(opts) {
  const o = opts || {};
  const w = 140;
  const h = 240;
  const seed = o.seed || 1321;
  const cx = w / 2;
  const baseY = h - 10;

  const fuss = slab(cx - 22, baseY - 20, cx + 22, baseY - 2, seed + 1, 1.3);
  const mast = slab(cx - 6, baseY - 200, cx + 6, baseY - 16, seed + 2, 1.1);
  // Der Hahn braucht Kopf, Brust, Schwanzfächer und Beine, sonst bleibt er
  // ein roter Klecks am Stiel – als weicher Blob las er sich als Lolli.
  const hahnY = baseY - 212;
  const koerper = smoothClosed([
    [cx - 6, hahnY - 26], [cx + 6, hahnY - 30], [cx + 14, hahnY - 22],
    [cx + 16, hahnY - 10], [cx + 8, hahnY + 4], [cx - 8, hahnY + 8],
    [cx - 22, hahnY + 2], [cx - 18, hahnY - 12],
  ], 4);
  const schwanz = smoothClosed([
    [cx - 18, hahnY - 6], [cx - 34, hahnY - 26], [cx - 44, hahnY - 12],
    [cx - 40, hahnY + 4], [cx - 26, hahnY + 10],
  ], 4);
  const kamm = smoothClosed([
    [cx - 2, hahnY - 30], [cx + 2, hahnY - 40], [cx + 8, hahnY - 32],
    [cx + 13, hahnY - 40], [cx + 16, hahnY - 28],
  ], 3);
  const schnabel = poly([
    [cx + 14, hahnY - 24], [cx + 30, hahnY - 20], [cx + 14, hahnY - 16],
  ], 2);
  const hahn = koerper;
  const kreuzA = slab(cx - 30, baseY - 172, cx + 30, baseY - 166, seed + 3, 1.1);
  const kreuzB = slab(cx - 3, baseY - 190, cx + 3, baseY - 148, seed + 4, 1.1);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.5,
    outline: 1.8,
    shadow: function (g) { groundShadow(g, cx, baseY - 3, 26, 9, seed, 0.15); },
    wash: function (g) {
      wash(g, fuss, '#9c9488', { seed: seed + 10 });
      wash(g, mast, '#8d949a', { seed: seed + 11 });
      wash(g, kreuzA, '#8d949a', { seed: seed + 12 });
      wash(g, kreuzB, '#8d949a', { seed: seed + 13 });
      wash(g, schwanz, '#a24d31', { seed: seed + 14, scale: 1.03 });
      wash(g, koerper, '#c0623f', { seed: seed + 15, scale: 1.03 });
      wash(g, offsetShape(koerper, 12, 4, 0.6), '#94422a', { seed: seed + 16, alpha: 0.55 });
      wash(g, kamm, '#d8483a', { seed: seed + 17, scale: 1.04 });
      wash(g, schnabel, '#e8b455', { seed: seed + 18 });
    },
    shape: function (g) {
      fill(g, fuss); fill(g, mast); fill(g, kreuzA); fill(g, kreuzB);
      fill(g, schwanz); fill(g, koerper); fill(g, kamm); fill(g, schnabel);
    },
    ink: function (g) {
      inkStroke(g, koerper, { width: 2.0, vary: 0.3, seed: seed + 20, color: ink.line, alpha: 0.85 });
      inkStroke(g, kamm, { width: 1.6, vary: 0.3, seed: seed + 21, color: ink.line, alpha: 0.8 });
      // Federn im Schwanzfächer
      for (let i = 0; i < 3; i++) {
        inkLine(g, cx - 20, hahnY - 2 + i * 5, cx - 40, hahnY - 18 + i * 11,
          { width: 1.5, bend: 0.12, seed: seed + 24 + i, color: ink.line, alpha: 0.65 });
      }
      dot(null, g, cx + 6, hahnY - 24, 2.8, ink.line, seed + 30);
      // Die Himmelsrichtungen am Kreuz
      dot(null, g, cx - 30, baseY - 169, 2.6, ink.line, seed + 32);
      dot(null, g, cx + 30, baseY - 169, 2.6, ink.line, seed + 33);
    },
  });
  return made(res, w, h, cx, baseY);
}

/* ------------------------------------------------------- Flaches am Boden */

/**
 * Der Fußpunkt liegt bei flachen Sachen in der MITTE, nicht an der Unterkante.
 * Sonst stünde die Matte vor der Stelle, auf die man sie gelegt hat.
 */
export function paintMat(opts) {
  const o = opts || {};
  const w = 196;
  const h = 132;
  const seed = o.seed || 1331;
  const cx = w / 2;
  const cy = h / 2;

  const matte = poly([
    [cx - 84, cy - 40], [cx + 84, cy - 40], [cx + 84, cy + 40], [cx - 84, cy + 40],
  ], 3);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.4,
    outline: 1.6,
    wash: function (g) {
      wash(g, matte, '#d8c08a', { seed: seed + 1, scale: 1.02 });
      wash(g, offsetShape(matte, 0, 14, 0.72), '#bda068', { seed: seed + 2, alpha: 0.45 });
    },
    shape: function (g) { fill(g, matte); },
    ink: function (g) {
      // Geflecht: quer und längs, sonst ist es ein braunes Rechteck
      for (let i = 1; i < 7; i++) {
        const y = cy - 40 + (80 / 7) * i;
        inkLine(g, cx - 80, y, cx + 80, y,
          { width: 1.3, bend: 0.03, seed: seed + 10 + i, color: ink.lineSoft, alpha: 0.5 });
      }
      for (let i = 1; i < 9; i++) {
        const x = cx - 84 + (168 / 9) * i;
        inkLine(g, x, cy - 36, x, cy + 36,
          { width: 1.1, bend: 0.02, seed: seed + 20 + i, color: ink.lineSoft, alpha: 0.35 });
      }
    },
  });
  return made(res, w, h, cx, cy);
}

export function paintPond(opts) {
  const o = opts || {};
  const w = 236;
  const h = 168;
  const seed = o.seed || 1341;
  const cx = w / 2;
  const cy = h / 2;

  const rand = smoothClosed(blob(cx, cy, 100, 66, seed + 1, 0.1, 22), 6);
  const wasser = smoothClosed(blob(cx, cy, 84, 52, seed + 2, 0.09, 22), 6);
  const steine = [];
  const rng = makeRng((seed + 10) >>> 0);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rng() * 0.3;
    const x = cx + Math.cos(a) * 96;
    const y = cy + Math.sin(a) * 62;
    steine.push(smoothClosed(blob(x, y, 13 + rng() * 6, 10 + rng() * 4, seed + 20 + i, 0.16, 12), 5));
  }
  const blatt = smoothClosed(blob(cx - 24, cy + 10, 20, 13, seed + 40, 0.12, 14), 5);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.6,
    outline: 1.6,
    wash: function (g) {
      wash(g, rand, '#9a8a6c', { seed: seed + 50, scale: 1.02 });
      wash(g, wasser, '#7ba8bd', { seed: seed + 51, scale: 1.02 });
      wash(g, offsetShape(wasser, -18, -8, 0.6), '#a9cfdc', { seed: seed + 52, alpha: 0.65 });
      for (let i = 0; i < steine.length; i++) {
        wash(g, steine[i], i % 2 ? '#b8b0a0' : '#a49b8b', { seed: seed + 60 + i, scale: 1.03 });
      }
      wash(g, blatt, ink.leafDark, { seed: seed + 80, scale: 1.03 });
    },
    shape: function (g) {
      fill(g, rand);
      for (let i = 0; i < steine.length; i++) fill(g, steine[i]);
    },
    ink: function (g) {
      inkStroke(g, wasser, { width: 1.8, vary: 0.3, seed: seed + 90, color: ink.line, alpha: 0.5 });
      inkStroke(g, blatt, { width: 1.6, vary: 0.3, seed: seed + 91, color: ink.line, alpha: 0.7 });
      for (let i = 0; i < steine.length; i++) {
        inkStroke(g, steine[i], { width: 1.5, vary: 0.3, seed: seed + 92 + i, color: ink.line, alpha: 0.6 });
      }
      // Zwei Wellenkringel
      inkLine(g, cx + 12, cy - 12, cx + 44, cy - 16,
        { width: 1.3, bend: 0.35, seed: seed + 110, color: ink.lineSoft, alpha: 0.55 });
      inkLine(g, cx + 6, cy + 14, cx + 38, cy + 10,
        { width: 1.2, bend: 0.3, seed: seed + 111, color: ink.lineSoft, alpha: 0.45 });
    },
  });
  return made(res, w, h, cx, cy);
}
