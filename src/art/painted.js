/**
 * Gemalte Naturobjekte im Tinte-und-Aquarell-Stil.
 *
 * Jedes Objekt wird in fünf Durchgängen aufgebaut:
 *   shadow  – weicher Bodenschatten
 *   wash    – Farbflächen, absichtlich leicht neben der Form (werden weich)
 *   detail  – farbige Feinheiten, scharf, aber im Malbuch blass (Blattbüschel)
 *   shape   – die reine Silhouette; daraus entsteht EINE Außenkontur
 *   ink     – Innenlinien, scharf obendrauf; bleiben auch unkoloriert stehen
 *
 * Jeder Maler liefert beide Fassungen zurück: koloriert und als blasse
 * Zeichnung. Die zweite ist der Ausgangszustand der Insel.
 */
import {
  blob, teardrop, smoothClosed, offsetShape, pathFrom, clipTo,
  inkStroke, inkLine, wash, washGroup, paintObject, groundShadow, LIGHT,
} from './brush.js';
import { makeRng } from '../core/rng.js';

/** Die Farbwelt: warmes Papier, Tinte in Sepia statt Schwarz. */
export const INK = {
  line: '#4a4038',
  lineSoft: '#7a6f5e',
  paper: '#f8f3e7',
  paperShade: '#ece4d0',

  leaf: '#9ec455',
  leafLight: '#c6e085',
  leafDark: '#71993c',
  leafDeep: '#4e732b',
  pine: '#5d8a42',
  pineDark: '#3d6636',
  pineLight: '#82ab4d',
  autumn: '#e2a04c',
  autumnLight: '#f2c87e',
  autumnDark: '#c07a30',
  autumnDeep: '#9a5721',
  birchLeaf: '#bcd66e',
  birchLight: '#dcea9f',
  birchDark: '#94b352',
  birchDeep: '#6f8d38',

  trunk: '#d7bf94',
  trunkShade: '#a98a5d',
  bark: '#c19566',
  barkDark: '#966f45',
  birchBark: '#f2ece0',
  birchShade: '#cfc6ae',

  grass: '#bcd67f',
  grassLight: '#d8e7a6',
  grassDark: '#95b45c',

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
 * Rechteckige Fläche, die rechteckig bleibt.
 *
 * Vier Punkte durch eine Catmull-Rom-Kurve ergeben immer einen Laib – für
 * Bretter, Theken und Pfosten ist das falsch. Mit Stützpunkten auf den Kanten
 * bleibt die Kurve dicht an der Geraden, und nur die Ecken werden weich. Ein
 * kleiner Versatz je Punkt hält das Ganze handgemalt statt technisch.
 */
export function slab(x0, y0, x1, y1, seed, wob) {
  const rng = makeRng((seed || 1) >>> 0);
  const j = wob == null ? 1.6 : wob;
  const nx = Math.max(3, Math.round(Math.abs(x1 - x0) / 26));
  const ny = Math.max(2, Math.round(Math.abs(y1 - y0) / 26));
  const pts = [];
  function edge(ax, ay, bx, by, n) {
    for (let i = 0; i < n; i++) {
      const t = i / n;
      pts.push([
        ax + (bx - ax) * t + (rng() - 0.5) * j,
        ay + (by - ay) * t + (rng() - 0.5) * j,
      ]);
    }
  }
  edge(x0, y0, x1, y0, nx);
  edge(x1, y0, x1, y1, ny);
  edge(x1, y1, x0, y1, nx);
  edge(x0, y1, x0, y0, ny);
  return smoothClosed(pts, 2);
}

/**
 * Dasselbe wie `slab`, nur für schräge Kanten.
 *
 * Ein Giebel ist kein Rechteck, soll aber genauso wenig zum Laib zerlaufen.
 * Stützpunkte auf jeder Kante halten die Kurve nah an der Geraden.
 */
export function poly(ecken, smooth) {
  const pts = [];
  for (let i = 0; i < ecken.length; i++) {
    const a = ecken[i];
    const b = ecken[(i + 1) % ecken.length];
    const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 26));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return smoothClosed(pts, smooth == null ? 2 : smooth);
}

/** Viereck mit runden Ecken – für Sitzflächen, Bretter, Kissen. */
export function quad(a, b, c, d, smooth) {
  return smoothClosed([a, b, c, d], smooth || 4);
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

/**
 * Blattbüscheln: kleine Bögen über eine Krone verteilt.
 *
 * In der Vorlage steckt in jeder Baumkrone ein Dutzend solcher Zeichen. Sie
 * machen aus einer gefärbten Fläche eine gezeichnete Krone. Auf der
 * Schattenseite stehen sie dichter, weil dort ohnehin mehr Struktur sitzt.
 */
export function leafClumps(g, cx, cy, rx, ry, seed, color) {
  const rng = makeRng(seed >>> 0);
  const n = 16;
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = color || ink.leafDeep;
  for (let i = 0; i < n; i++) {
    // Gleichmäßig über die Fläche, nicht geballt in der Mitte
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * 0.88;
    const x = cx + Math.cos(a) * rx * r;
    const y = cy + Math.sin(a) * ry * r;
    // Zum Licht hin blasser, vom Licht weg kräftiger
    const lit = (Math.cos(a) * LIGHT.x + Math.sin(a) * LIGHT.y) * r;
    g.globalAlpha = 0.34 + Math.max(0, -lit) * 0.4 + rng() * 0.12;
    const wdt = rx * (0.15 + rng() * 0.11);
    g.lineWidth = 1.6 + rng() * 1.0;
    g.beginPath();
    g.moveTo(x - wdt, y);
    g.quadraticCurveTo(x, y - wdt * 0.95, x + wdt, y);
    g.stroke();
  }
  g.restore();
}

/**
 * Nadelsaum: kurze Striche, die von einer Etagenkante nach unten außen
 * ausfransen. Ohne sie bleibt ein Nadelbaum ein gestapelter, glatter Kegel;
 * mit ihnen bekommt er eine zerfaserte, gezeichnete Kante.
 */
export function needleFringe(g, cx, y, halfW, seed, color) {
  const rng = makeRng(seed >>> 0);
  const n = Math.round(halfW * 0.34);
  g.save();
  g.lineCap = 'round';
  g.strokeStyle = color || ink.pineDark;
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const side = t < 0.5 ? -1 : 1;
    // Zur Spitze hin steiler, zur Kante hin flacher – wie die Zweige selbst
    const rel = Math.abs(t - 0.5) * 2;
    const x = cx + side * halfW * rel * (0.92 + rng() * 0.12);
    const yy = y - (1 - rel) * halfW * 0.34 + (rng() - 0.5) * 3;
    const len = 5 + rng() * 6;
    g.moveTo(x, yy);
    g.lineTo(x + side * len * (0.5 + rel * 0.6), yy + len * (0.85 - rel * 0.35));
  }
  g.globalAlpha = 0.5;
  g.lineWidth = 1.7;
  g.stroke();
  g.restore();
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
  // Wald fällt sonst auf, dass alle Bäume dieselbe Form haben.
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
    blur: 1.8,
    outline: 2.0,
    shadow: function (g) { groundShadow(g, cx + 4, baseY - 3, 54, 15, seed, 0.16); },
    wash: function (g) {
      wash(g, trunk, trunkFill, { seed: seed + 9, dx: -2, dy: 2, scale: 1.04 });
      wash(g, offsetShape(trunk, 8, 4, 0.66), trunkShade, { seed: seed + 10, alpha: 0.85 });
      for (let i = 0; i < lobes.length; i++) {
        wash(g, lobes[i], leafMid, { seed: seed + 20 + i, scale: 1.05 });
      }
      // Schattenseite: JEDER Lappen bekommt seine dunkle Hälfte, vom Licht weg
      // versetzt. Die Überlappungen bauen sich zu einer zusammenhängenden
      // Schattenseite auf – vorher lag nur an zwei Lappen etwas Dunkles, und
      // die Krone blieb eine flache Fläche.
      const shx = -LIGHT.x * 15;
      const shy = -LIGHT.y * 15;
      const schatten = [];
      const tief = [];
      for (let i = 0; i < lobes.length; i++) {
        schatten.push(offsetShape(lobes[i], shx, shy, 0.84));
        tief.push(offsetShape(lobes[i], shx * 1.9, shy * 1.8, 0.6));
      }
      // Als Gruppe, nicht einzeln: sonst addieren sich die Überlappungen und
      // die Schattenseite wird ein Verlauf statt einer Fläche mit Kante.
      washGroup(g, schatten, leafDark, { alpha: 0.62 });
      washGroup(g, tief, o.leafDeep || ink.leafDeep, { alpha: 0.4 });
      // Lichtseite zuletzt, damit sie oben liegt
      washGroup(g, [
        offsetShape(lobes[0], LIGHT.x * 20, LIGHT.y * 18, 0.68),
        offsetShape(lobes[4], LIGHT.x * 10, LIGHT.y * 10, 0.66),
      ], leafLight, { alpha: 0.85 });
      for (let i = 0; i < fruits.length; i++) {
        dot(g, null, fruits[i][0], fruits[i][1], 7.5, o.fruit, seed + 90 + i);
      }
    },
    shape: function (g) {
      fill(g, trunk);
      for (let i = 0; i < lobes.length; i++) fill(g, lobes[i]);
    },
    // Blattbüscheln: viele kleine Bögen quer durch die Krone. Das ist der
    // Unterschied zwischen einer gefärbten Fläche und einer Zeichnung –
    // vorher standen hier neun verlorene Striche. Sie liegen in `detail`,
    // nicht in `ink`: grüne Tinte bliebe sonst auch im Malbuch grün.
    detail: function (g) {
      leafClumps(g, cx, canopyY + 10, 58 * sx, 50, seed + 500, o.leafDeep || ink.leafDeep);
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
    blur: 1.8,
    outline: 2.0,
    shadow: function (g) { groundShadow(g, cx + 3, baseY - 3, 46, 13, seed, 0.16); },
    wash: function (g) {
      wash(g, trunk, ink.trunk, { seed: seed + 3, dx: -1, dy: 2 });
      wash(g, offsetShape(trunk, 7, 2, 0.66), ink.trunkShade, { seed: seed + 4, alpha: 0.8 });
      // Dieselbe Sonne wie beim Laubbaum: hell nach oben links, dunkel nach
      // unten rechts. Dazu liegt jede Etage im Schatten der darüber – das
      // macht aus dem gestapelten Kegel einen Baum mit Tiefe.
      for (let i = 0; i < tiers.length; i++) {
        wash(g, tiers[i], ink.pine, { seed: seed + 12 + i, scale: 1.05 });
      }
      // Schatten- und Lichtseite je als EINE Fläche, sonst addieren sich die
      // Etagenüberlappungen zu einem Verlauf.
      const dunkel = [];
      const hell = [];
      for (let i = 0; i < tiers.length; i++) {
        dunkel.push(offsetShape(tiers[i], -LIGHT.x * 17, -LIGHT.y * 13, 0.66));
        hell.push(offsetShape(tiers[i], LIGHT.x * 15, LIGHT.y * 10, 0.52));
      }
      washGroup(g, dunkel, ink.pineDark, { alpha: 0.66 });
      washGroup(g, hell, ink.pineLight, { alpha: 0.7 });
    },
    shape: function (g) {
      fill(g, trunk);
      for (let i = 0; i < tiers.length; i++) fill(g, tiers[i]);
    },
    detail: function (g) {
      // Jede Etage franst nach unten aus. Das ist der ganze Unterschied
      // zwischen einem Stapel Dreiecke und einer Fichte.
      for (let i = 0; i < tiers.length; i++) {
        needleFringe(g, cx, spec[i][0] - 3, spec[i][1] * 0.86, seed + 200 + i * 13, ink.pineDark);
      }
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
    blur: 1.5,
    outline: 1.8,
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
    blur: 1.8,
    outline: 2.0,
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

  /**
   * Deckfläche. Ein Stein aus einer einzigen Blase bleibt ein Kiesel; erst
   * eine eigene, zum Licht geneigte Oberseite mit sichtbarer Bruchkante macht
   * daraus einen Felsen.
   */
  const rngTop = makeRng(seed + 300);
  const top = smoothClosed([
    [cx - 44 * scale, baseY - 32 * scale],
    [cx - 33 * scale, baseY - 52 * scale + rngTop() * 6],
    [cx - 6 * scale, baseY - 60 * scale],
    [cx + 20 * scale, baseY - 50 * scale],
    [cx + 28 * scale, baseY - 36 * scale],
    [cx + 6 * scale, baseY - 30 * scale],
    [cx - 22 * scale, baseY - 27 * scale],
  ], 5);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.5,
    outline: 1.8 * Math.min(1.2, scale),
    shadow: function (g) { groundShadow(g, cx + 4, baseY - 3, 42 * scale, 11 * scale, seed + 1, 0.15); },
    wash: function (g) {
      // Der Stein darf seine Farbe wechseln: Der Granit im Hochland ist
      // kälter als der Findling am Strand, sonst wäre der neue Bereich nur
      // derselbe Stein an einer anderen Stelle.
      wash(g, body, o.tint || ink.rock, { seed: seed + 2, scale: 1.05 });
      // Vorderseite liegt im Schatten, Deckfläche fängt das Licht
      wash(g, offsetShape(body, -LIGHT.x * 16 * scale, -LIGHT.y * 13 * scale, 0.78),
        o.tintShade || ink.rockShade, { seed: seed + 3, alpha: 0.8 });
      wash(g, offsetShape(body, -LIGHT.x * 24 * scale, -LIGHT.y * 17 * scale, 0.5),
        o.tintDeep || ink.rockDeep, { seed: seed + 4, alpha: 0.4 });
      wash(g, top, '#efece0', { seed: seed + 30, alpha: 0.72, scale: 1.02 });
      if (o.moss !== false) {
        // Moos gehört auf den Stein, nicht daneben: die Lasuren liegen
        // absichtlich versetzt, und ohne Beschnitt schwebte das Grün frei
        // über der Kante.
        clipTo(g, [body]);
        wash(g, moss, ink.moss, { seed: seed + 6, alpha: 0.7 });
        g.restore();
      }
      if (o.ore) {
        const adern = o.oreColor || ink.copper;
        dot(g, null, cx + 11 * scale, baseY - 34 * scale, 9 * scale, adern, seed + 8);
        dot(g, null, cx - 15 * scale, baseY - 22 * scale, 7 * scale, adern, seed + 11);
        if (o.ore3) dot(g, null, cx - 2 * scale, baseY - 48 * scale, 6 * scale, adern, seed + 13);
      }
    },
    shape: function (g) { fill(g, body); },
    ink: function (g) {
      // Bruchkante zwischen Deckfläche und Vorderseite
      inkStroke(g, top, { width: 1.7 * Math.min(1.2, scale), vary: 0.35,
        seed: seed + 31, color: ink.lineSoft, alpha: 0.5 });
      inkLine(g, cx - 7 * scale, baseY - 55 * scale, cx + 2, baseY - 26 * scale,
        { width: 1.8, bend: 0.16, seed: seed + 21, alpha: 0.55 });
      inkLine(g, cx + 2, baseY - 32 * scale, cx + 21 * scale, baseY - 21 * scale,
        { width: 1.5, bend: -0.12, seed: seed + 22, alpha: 0.42 });
      if (o.ore) {
        const adern = o.oreColor || ink.copper;
        dot(null, g, cx + 11 * scale, baseY - 34 * scale, 9 * scale, adern, seed + 8);
        dot(null, g, cx - 15 * scale, baseY - 22 * scale, 7 * scale, adern, seed + 11);
        if (o.ore3) dot(null, g, cx - 2 * scale, baseY - 48 * scale, 6 * scale, adern, seed + 13);
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
    blur: 1.8,
    outline: 2.0,
    shadow: function (g) { groundShadow(g, cx, baseY - 2, 100, 14, seed, 0.16); },
    wash: function (g) {
      for (let i = 0; i < chunks.length; i++) {
        wash(g, chunks[i], ink.rock, { seed: seed + 20 + i, scale: 1.05 });
        wash(g, offsetShape(chunks[i], 12, 9, 0.68), ink.rockShade, { seed: seed + 30 + i, alpha: 0.7 });
      }
      clipTo(g, chunks);
      wash(g, smoothClosed(blob(70, baseY - 88, 28, 10, seed + 60, 0.3, 12), 4), ink.moss, { seed: seed + 61, alpha: 0.6 });
      g.restore();
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
    blur: 1.5,
    outline: 1.8,
    shadow: function (g) { groundShadow(g, cx + 3, baseY - 3, 44, 11, seed + 4, 0.14); },
    wash: function (g) {
      for (let i = 0; i < lobes.length; i++) wash(g, lobes[i], ink.leaf, { seed: seed + 10 + i, scale: 1.05 });
      // Wie bei den Kronen: jeder Lappen bekommt seine Schattenhälfte, damit
      // aus der flachen Amöbe ein Busch mit Volumen wird.
      const dunkel = [];
      for (let i = 0; i < lobes.length; i++) {
        dunkel.push(offsetShape(lobes[i], -LIGHT.x * 12, -LIGHT.y * 11, 0.82));
      }
      washGroup(g, dunkel, ink.leafDark, { alpha: 0.6 });
      washGroup(g, [offsetShape(lobes[0], -LIGHT.x * 18, -LIGHT.y * 15, 0.55)],
        ink.leafDeep, { alpha: 0.34 });
      washGroup(g, [offsetShape(lobes[0], LIGHT.x * 15, LIGHT.y * 13, 0.58)],
        ink.leafLight, { alpha: 0.85 });
      if (o.berries) {
        for (let i = 0; i < berries.length; i++) dot(g, null, berries[i][0], berries[i][1], 6, ink.berry, seed + 40 + i);
      }
    },
    shape: function (g) { for (let i = 0; i < lobes.length; i++) fill(g, lobes[i]); },
    detail: function (g) {
      leafClumps(g, cx, baseY - 30, 40, 24, seed + 600, ink.leafDeep);
    },
    ink: function (g) {
      inkLine(g, cx - 30, baseY - 30, cx - 6, baseY - 40, { width: 1.8, bend: 0.28, seed: seed + 30, alpha: 0.55 });
      inkLine(g, cx + 31, baseY - 31, cx + 8, baseY - 41, { width: 1.8, bend: -0.28, seed: seed + 31, alpha: 0.5 });
      // Ein paar Blattspitzen am oberen Rand – ohne sie bleibt der Umriss glatt
      const rngLeaf = makeRng(seed + 700);
      for (let i = 0; i < 6; i++) {
        const a = -0.4 - rngLeaf() * 2.4;
        const x = cx + Math.cos(a) * 34;
        const y = baseY - 34 + Math.sin(a) * 24;
        inkLine(g, x, y, x + (rngLeaf() - 0.5) * 12, y - 7 - rngLeaf() * 6,
          { width: 1.3, bend: 0.3, seed: seed + 50 + i, color: ink.lineSoft, alpha: 0.45 });
      }
      if (o.berries) {
        for (let i = 0; i < berries.length; i++) dot(null, g, berries[i][0], berries[i][1], 6, ink.berry, seed + 40 + i);
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

/**
 * Mondblume: nachts auf der Wiese. Ein heller Schimmer hinter der Blüte macht
 * sie im Dunkeln auffindbar, ohne dass sie eine Lichtquelle sein müsste.
 */
export function paintMoonflower(opts) {
  const o = opts || {};
  const w = 68;
  const h = 92;
  const seed = o.seed || 811;
  const cx = w / 2;
  const baseY = h - 10;
  const headY = 30;

  const petals = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    petals.push(smoothClosed(blob(cx + Math.cos(a) * 13, headY + Math.sin(a) * 12,
      9, 8, seed + i, 0.16, 12), 5));
  }
  const core = smoothClosed(blob(cx, headY, 8, 7.5, seed + 20, 0.12, 12), 4);
  const stem = smoothClosed([[cx - 3, baseY], [cx - 4, headY + 14], [cx + 4, headY + 14], [cx + 3, baseY]], 4);
  const leaf = smoothClosed(blob(cx - 14, baseY - 28, 13, 6, seed + 21, 0.2, 12), 4);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.2,
    outline: 1.3,
    shadow: function (g) { groundShadow(g, cx, baseY - 2, 14, 5, seed + 1, 0.1); },
    wash: function (g) {
      g.save();
      g.globalAlpha = 0.4;
      g.fillStyle = '#dfe6ff';
      fill(g, smoothClosed(blob(cx, headY, 30, 29, seed + 30, 0.1, 16), 6));
      g.restore();
      wash(g, stem, ink.grassDark, { seed: seed + 2 });
      wash(g, leaf, '#8fae86', { seed: seed + 4 });
      for (let i = 0; i < petals.length; i++) {
        wash(g, petals[i], '#e8ecff', { seed: seed + 40 + i, scale: 1.06 });
        wash(g, offsetShape(petals[i], -LIGHT.x * 6, -LIGHT.y * 5, 0.6), '#bcc6ee',
          { seed: seed + 50 + i, alpha: 0.5 });
      }
      wash(g, core, '#f6e9a8', { seed: seed + 6 });
    },
    shape: function (g) {
      fill(g, stem); fill(g, leaf);
      for (let i = 0; i < petals.length; i++) fill(g, petals[i]);
      fill(g, core);
    },
    ink: function (g) {
      for (let i = 0; i < petals.length; i++) {
        inkStroke(g, petals[i], { width: 1.4, vary: 0.3, seed: seed + 60 + i, color: ink.lineSoft, alpha: 0.5 });
      }
      inkStroke(g, core, { width: 1.6, vary: 0.3, seed: seed + 70, color: ink.line, alpha: 0.6 });
    },
  });
  return made(res, w, h, cx, baseY);
}

/** Regenpilz: taucht nur an Regentagen auf, dunkelblau mit hellen Tupfen. */
export function paintRainmushroom(opts) {
  const o = opts || {};
  const w = 76;
  const h = 74;
  const seed = o.seed || 821;
  const cx = w / 2;
  const baseY = h - 10;

  const caps = [
    { x: cx, y: baseY - 34, rx: 25, ry: 17 },
    { x: cx - 20, y: baseY - 20, rx: 15, ry: 11 },
  ];
  const capShapes = caps.map(function (c, i) {
    const pts = smoothClosed(blob(c.x, c.y, c.rx, c.ry, seed + i, 0.12, 16), 5);
    for (let k = 0; k < pts.length; k++) {
      if (pts[k][1] > c.y + 2) pts[k][1] = c.y + 2 + (pts[k][1] - c.y - 2) * 0.2;
    }
    return pts;
  });
  const stems = [
    smoothClosed([[cx - 7, baseY], [cx - 6, baseY - 30], [cx + 6, baseY - 30], [cx + 7, baseY]], 4),
    smoothClosed([[cx - 24, baseY], [cx - 23, baseY - 18], [cx - 16, baseY - 18], [cx - 15, baseY]], 4),
  ];

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.1,
    outline: 1.5,
    shadow: function (g) { groundShadow(g, cx - 4, baseY - 2, 24, 7, seed + 1, 0.13); },
    wash: function (g) {
      for (let i = 0; i < stems.length; i++) wash(g, stems[i], '#eae2cf', { seed: seed + 5 + i });
      for (let i = 0; i < capShapes.length; i++) {
        wash(g, capShapes[i], '#5f7fa8', { seed: seed + 10 + i, scale: 1.05 });
        wash(g, offsetShape(capShapes[i], -LIGHT.x * 10, -LIGHT.y * 7, 0.65), '#42618a',
          { seed: seed + 14 + i, alpha: 0.6 });
        wash(g, offsetShape(capShapes[i], LIGHT.x * 8, LIGHT.y * 6, 0.5), '#8aa9cd',
          { seed: seed + 18 + i, alpha: 0.6 });
      }
      const rng = makeRng(seed + 90);
      for (let i = 0; i < 5; i++) {
        dot(g, null, cx - 16 + rng() * 32, baseY - 42 + rng() * 14, 3.2 + rng() * 1.6, '#e6eef8', seed + 100 + i);
      }
    },
    shape: function (g) {
      for (let i = 0; i < stems.length; i++) fill(g, stems[i]);
      for (let i = 0; i < capShapes.length; i++) fill(g, capShapes[i]);
    },
    ink: function (g) {
      for (let i = 0; i < capShapes.length; i++) {
        inkStroke(g, capShapes[i], { width: 1.7, vary: 0.3, seed: seed + 30 + i, color: ink.line, alpha: 0.55 });
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

/** Nebelkristall: nur bei Nebel, milchig und kantig. Braucht die Spitzhacke. */
export function paintFogcrystal(opts) {
  const o = opts || {};
  const w = 78;
  const h = 92;
  const seed = o.seed || 831;
  const cx = w / 2;
  const baseY = h - 10;

  const shards = [
    smoothClosed([[cx - 6, baseY - 2], [cx - 12, baseY - 40], [cx - 2, baseY - 62],
      [cx + 8, baseY - 38], [cx + 6, baseY - 2]], 3),
    smoothClosed([[cx + 8, baseY - 2], [cx + 12, baseY - 30], [cx + 22, baseY - 44],
      [cx + 25, baseY - 24], [cx + 21, baseY - 2]], 3),
    smoothClosed([[cx - 22, baseY - 2], [cx - 24, baseY - 22], [cx - 15, baseY - 34],
      [cx - 10, baseY - 18], [cx - 11, baseY - 2]], 3),
  ];

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.2,
    outline: 1.5,
    shadow: function (g) { groundShadow(g, cx, baseY - 2, 24, 7, seed + 1, 0.13); },
    wash: function (g) {
      g.save();
      g.globalAlpha = 0.34;
      g.fillStyle = '#e7f2f4';
      fill(g, smoothClosed(blob(cx, baseY - 30, 32, 34, seed + 40, 0.1, 16), 6));
      g.restore();
      for (let i = 0; i < shards.length; i++) {
        wash(g, shards[i], '#cfe6ea', { seed: seed + 10 + i, scale: 1.04 });
        wash(g, offsetShape(shards[i], -LIGHT.x * 9, -LIGHT.y * 8, 0.55), '#9dc3ca',
          { seed: seed + 14 + i, alpha: 0.65 });
        wash(g, offsetShape(shards[i], LIGHT.x * 7, LIGHT.y * 9, 0.4), '#f2fbfc',
          { seed: seed + 18 + i, alpha: 0.7 });
      }
    },
    shape: function (g) { for (let i = 0; i < shards.length; i++) fill(g, shards[i]); },
    ink: function (g) {
      for (let i = 0; i < shards.length; i++) {
        inkStroke(g, shards[i], { width: 1.8, vary: 0.3, seed: seed + 30 + i, color: ink.line, alpha: 0.6 });
      }
      // Innenkante je Kristall – lässt sie geschliffen wirken
      inkLine(g, cx - 2, baseY - 58, cx - 1, baseY - 8, { width: 1.4, bend: 0.02, seed: seed + 50, alpha: 0.4 });
      inkLine(g, cx + 18, baseY - 40, cx + 16, baseY - 8, { width: 1.3, bend: 0.02, seed: seed + 51, alpha: 0.35 });
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
    blur: 1.0,
    outline: 1.3,
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
    blur: 1.5,
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
    blur: 1.2,
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
    outline: 1.3,
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
    blur: 1.2,
    outline: 1.6,
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
    blur: 1.2,
    outline: 1.5,
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

/**
 * Eine Feder im Gras.
 *
 * Sie stand als Gegenstand von Anfang an in der Liste – ein Geist konnte
 * sogar darum bitten –, aber es gab sie nirgends: kein Objekt ließ sie
 * fallen, kein Rezept, kein Laden. Gemessen waren das acht unlösbare
 * Aufträge in neunzig Tagen, und die Materialreihe im Fundbuch blieb für
 * immer unvollständig. Jetzt liegt sie herum, wo Vögel sind.
 *
 * Schräg gelegt, nicht senkrecht: Eine stehende Feder sieht aus, als wäre
 * sie eingepflanzt.
 */
export function paintFeather(opts) {
  const o = opts || {};
  const w = 72;
  const h = 52;
  const seed = o.seed || 271;
  const cx = w / 2;
  const baseY = h - 8;
  // Kiel von unten links nach oben rechts, Fahne beidseitig daran
  const a = [cx - 22, baseY - 2];
  const b = [cx + 22, baseY - 34];
  const fahne = smoothClosed([
    a,
    [cx - 12, baseY - 20], [cx + 2, baseY - 32], [cx + 16, baseY - 38],
    b,
    [cx + 12, baseY - 26], [cx - 2, baseY - 16], [cx - 14, baseY - 6],
  ], 6);
  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.0,
    outline: 1.5,
    shadow: function (g) { groundShadow(g, cx, baseY - 1, 20, 5, seed, 0.11); },
    wash: function (g) {
      wash(g, fahne, '#e4edf3', { seed: seed + 2, scale: 1.05 });
      wash(g, offsetShape(fahne, 5, 4, 0.62), '#b9cbd8', { seed: seed + 3, alpha: 0.65 });
    },
    shape: function (g) { fill(g, fahne); },
    ink: function (g) {
      // Der Kiel und ein paar Fahnenstriche – ohne sie ist es ein Blatt
      inkLine(g, a[0], a[1], b[0], b[1], { width: 1.8, bend: 0.05, seed: seed + 10, alpha: 0.75 });
      for (let i = 1; i <= 4; i++) {
        const t = i / 5;
        const px = a[0] + (b[0] - a[0]) * t;
        const py = a[1] + (b[1] - a[1]) * t;
        inkLine(g, px, py, px - 7, py - 6,
          { width: 1.2, bend: 0.06, seed: seed + 20 + i, color: ink.lineSoft, alpha: 0.5 });
        inkLine(g, px, py, px + 6, py + 6,
          { width: 1.2, bend: 0.06, seed: seed + 30 + i, color: ink.lineSoft, alpha: 0.45 });
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
    blur: 1.0,
    outline: 1.5,
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

/**
 * Sternenstaub.
 *
 * Am Morgen nach einer Sternennacht liegt er am Spülsaum. Ein Stern, kein
 * Kiesel: fünf Zacken, aber weich – ein exakter Stern sähe aus wie ein
 * Symbol aus einem Menü, und auf dieser Insel ist alles mit dem Pinsel
 * gemacht. Der Schein darunter ist ein zweiter, größerer Wasch in derselben
 * Farbe; er lässt ihn im Sand leuchten, ohne dass eine Lichtquelle nötig
 * wäre.
 */
export function paintStardust(opts) {
  const o = opts || {};
  const w = 60;
  const h = 54;
  const seed = o.seed || 293;
  const cx = w / 2;
  const baseY = h - 9;
  const cy = baseY - 15;

  // Fünf Zacken, jede etwas anders lang – von Hand gelegt, nicht gerechnet.
  const zacken = [];
  const lang = [15, 13.5, 14.5, 13, 14];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    const b = a + Math.PI / 5;
    zacken.push([cx + Math.cos(a) * lang[i], cy + Math.sin(a) * lang[i]]);
    zacken.push([cx + Math.cos(b) * 6.2, cy + Math.sin(b) * 6.2]);
  }
  const stern = smoothClosed(zacken, 2.2);
  const schein = smoothClosed(zacken.map(function (p) {
    return [cx + (p[0] - cx) * 1.7, cy + (p[1] - cy) * 1.7];
  }), 5);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.2,
    outline: 1.3,
    shadow: function (g) { groundShadow(g, cx + 1, baseY, 13, 4, seed, 0.10); },
    wash: function (g) {
      wash(g, schein, '#f2e9b8', { seed: seed + 1, scale: 1.2, alpha: 0.28 });
      wash(g, stern, '#fdf3c4', { seed: seed + 2, scale: 1.0 });
      wash(g, offsetShape(stern, 3, 2, 0.5), '#e8cf7c', { seed: seed + 3, alpha: 0.55 });
    },
    shape: function (g) { fill(g, stern); },
    ink: function (g) {
      // Ein paar Körnchen daneben – Staub, nicht ein einzelner Stein.
      const r = makeRng(seed + 40);
      for (let i = 0; i < 5; i++) {
        const a = r() * Math.PI * 2;
        const d = 17 + r() * 10;
        const px = cx + Math.cos(a) * d;
        const py = cy + Math.sin(a) * d * 0.6;
        g.globalAlpha = 0.5;
        g.fillStyle = '#e8cf7c';
        g.beginPath();
        g.arc(px, py, 1 + r() * 1.4, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    },
  });
  return made(res, w, h, cx, baseY);
}

export function paintDriftwood(opts) {
  const o = opts || {};
  const w = 116;
  const h = 62;
  const seed = o.seed || 281;
  const cx = w / 2;
  const baseY = h - 10;

  // Ein Ast, kein Kiesel: zum Ende hin dünner, mit einer Gabel und einem
  // abgebrochenen Stumpf. Die vorige Fassung war eine glatte Blase und im
  // Spiel nicht als Treibholz zu erkennen.
  const stem = smoothClosed([
    [10, baseY - 6], [16, baseY - 15], [42, baseY - 19],
    [70, baseY - 15], [92, baseY - 20], [106, baseY - 16],
    [105, baseY - 10], [88, baseY - 12], [68, baseY - 8],
    [40, baseY - 10], [16, baseY - 1],
  ], 6);
  const fork = smoothClosed([
    [64, baseY - 14], [78, baseY - 30], [86, baseY - 33],
    [84, baseY - 27], [72, baseY - 12],
  ], 6);
  const knot = smoothClosed(blob(30, baseY - 13, 7, 5.5, seed + 5, 0.08, 12), 5);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.1,
    outline: 1.6,
    shadow: function (g) { groundShadow(g, cx, baseY - 1, 44, 7, seed, 0.13); },
    wash: function (g) {
      wash(g, stem, '#e2d7c1', { seed: seed + 2, scale: 1.03 });
      wash(g, fork, '#ddd0b8', { seed: seed + 4, scale: 1.03 });
      wash(g, knot, '#cbbb9d', { seed: seed + 6 });
      wash(g, offsetShape(stem, 3, 5, 0.8), '#b8a68a', { seed: seed + 3, alpha: 0.6 });
    },
    shape: function (g) { fill(g, stem); fill(g, fork); fill(g, knot); },
    ink: function (g) {
      // Maserung läuft mit dem Ast, nicht quer darüber
      inkLine(g, 22, baseY - 11, 96, baseY - 15, { width: 1.5, bend: 0.04, seed: seed + 10, alpha: 0.5 });
      inkLine(g, 34, baseY - 8, 86, baseY - 12, { width: 1.2, bend: 0.03, seed: seed + 11, alpha: 0.35 });
      inkStroke(g, knot, { width: 1.3, vary: 0.25, seed: seed + 12, color: ink.line, alpha: 0.45 });
      // Bruchkante am dicken Ende
      inkLine(g, 12, baseY - 14, 14, baseY - 2, { width: 1.6, bend: 0.12, seed: seed + 13, alpha: 0.55 });
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
    blur: 1.5,
    outline: 1.7,
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

/* ------------------------------------------------------------------ Anbau */

/**
 * Eine Pflanze im Beet, in drei Stufen.
 *
 * Stufe 0 ist ein Keimling, 1 eine junge Pflanze, 2 die reife. Alle drei
 * stehen auf demselben Fleck umgegrabener Erde: Damit ist auch der Keimling
 * als „hier wurde gepflanzt" zu erkennen und nicht als zufälliges Gras. Ohne
 * das Beet sähe ein frisch gesäter Fleck aus wie nichts, und man liefe am
 * eigenen Garten vorbei.
 *
 * @param {object} opts stage 0..2, leaf, fruit, form 'beere'|'blatt'|'blüte'|'mond'
 */
export function paintCrop(opts) {
  const o = opts || {};
  const stage = o.stage == null ? 2 : o.stage;
  const w = 78;
  const h = 88;
  const seed = o.seed || 401;
  const cx = w / 2;
  const baseY = h - 10;
  const leafColor = o.leaf || ink.leaf;
  const fruitColor = o.fruit || ink.berry;
  const form = o.form || 'beere';

  // Beet: ein flacher Hügel aus dunkler Erde, in allen Stufen gleich
  const beet = smoothClosed(blob(cx, baseY - 5, 25, 9, seed + 1, 0.22, 14), 5);

  const hoehe = stage === 0 ? 16 : stage === 1 ? 32 : 44;
  const stemTop = baseY - 6 - hoehe;
  const stem = smoothClosed([
    [cx - 2.6, baseY - 6], [cx - 3.2, stemTop + 4], [cx + 3.2, stemTop + 4], [cx + 2.6, baseY - 6],
  ], 4);

  // Blätter: paarweise, nach oben hin kleiner und schräg nach oben gestellt.
  //
  // Waagerechte Ovale übereinander sahen aus wie eine kleine Tanne. Erst der
  // Winkel macht daraus eine Pflanze, die aus dem Boden strebt.
  function dreh(pts, ox, oy, winkel) {
    const c = Math.cos(winkel);
    const si = Math.sin(winkel);
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const dx = pts[i][0] - ox;
      const dy = pts[i][1] - oy;
      out.push([ox + dx * c - dy * si, oy + dx * si + dy * c]);
    }
    return out;
  }
  const blaetter = [];
  const paare = stage === 0 ? 1 : stage === 1 ? 2 : 3;
  for (let p = 0; p < paare; p++) {
    const y = baseY - 10 - (hoehe * (p + 0.65)) / (paare + 0.25);
    const gr = (stage === 0 ? 10 : 13) - p * 1.8;
    const neigung = 0.42 - p * 0.06;
    for (let seite = -1; seite <= 1; seite += 2) {
      const lx = cx + seite * (7 + p * 0.8);
      const roh = blob(lx + seite * gr * 0.55, y, gr, gr * 0.46, seed + 10 + p * 7 + (seite > 0 ? 3 : 0), 0.2, 12);
      blaetter.push(smoothClosed(dreh(roh, lx, y, -seite * neigung), 4));
    }
  }
  // Kraut trägt keine Beeren, sondern mehr Blattwerk: ein Büschel obenauf.
  if (stage === 2 && form === 'blatt') {
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i - 1) * 0.5;
      const lx = cx + Math.cos(a) * 8;
      const ly = stemTop + 8 + Math.sin(a) * 3;
      const roh = blob(lx + Math.cos(a) * 7, ly + Math.sin(a) * 7, 11, 5, seed + 70 + i, 0.2, 12);
      blaetter.push(smoothClosed(dreh(roh, lx, ly, a + Math.PI / 2), 4));
    }
  }

  // Früchte nur in der reifen Stufe – daran erkennt man auf zwanzig Meter,
  // ob sich das Hinlaufen lohnt.
  const fruchtR = form === 'mond' ? 11 : form === 'blüte' ? 10 : 7;
  const fruechte = [];
  if (stage === 2 && form !== 'blatt') {
    const rng = makeRng(seed + 33);
    const n = form === 'blüte' || form === 'mond' ? 1 : 3;
    for (let i = 0; i < n; i++) {
      const a = n === 1 ? -Math.PI / 2 : (i / n) * Math.PI * 2 + 0.7;
      // Die einzelne Blüte sitzt ÜBER den obersten Blättern, nicht dazwischen:
      // sonst verschwindet sie zwischen dem Grün und die reife Pflanze ist von
      // weitem nicht von der jungen zu unterscheiden.
      fruechte.push([
        cx + Math.cos(a) * (n === 1 ? 0 : 11),
        (n === 1 ? stemTop - 1 : stemTop + 7 + Math.sin(a) * 8) + rng() * 2,
      ]);
    }
  }

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.2,
    outline: 1.25,
    shadow: function (g) { groundShadow(g, cx + 2, baseY - 3, 26, 8, seed + 4, 0.13); },
    wash: function (g) {
      wash(g, beet, ink.dirtDark, { seed: seed + 5, alpha: 0.9 });
      wash(g, smoothClosed(blob(cx - 4, baseY - 7, 15, 5, seed + 6, 0.26, 12), 4),
        ink.dirt, { seed: seed + 7, alpha: 0.7 });
      wash(g, stem, ink.grassDark, { seed: seed + 8 });
      for (let i = 0; i < blaetter.length; i++) {
        wash(g, blaetter[i], leafColor, { seed: seed + 40 + i, scale: 1.05 });
      }
      if (blaetter.length) {
        washGroup(g, blaetter.map(function (b) {
          return offsetShape(b, -LIGHT.x * 5, -LIGHT.y * 4, 0.78);
        }), ink.leafDeep, { alpha: 0.42 });
      }
      for (let i = 0; i < fruechte.length; i++) {
        dot(g, null, fruechte[i][0], fruechte[i][1], fruchtR,
          fruitColor, seed + 60 + i);
      }
    },
    shape: function (g) {
      fill(g, beet);
      fill(g, stem);
      for (let i = 0; i < blaetter.length; i++) fill(g, blaetter[i]);
      for (let i = 0; i < fruechte.length; i++) {
        const f = fruechte[i];
        g.moveTo(f[0] + fruchtR, f[1]);
        g.ellipse(f[0], f[1], fruchtR, fruchtR * 0.94, 0, 0, Math.PI * 2);
      }
    },
    ink: function (g) {
      // Blattadern – ohne sie sind die Blätter nur grüne Ovale. Sie laufen
      // vom Stängel in die Blattspitze, also mit demselben Winkel.
      for (let p = 0; p < paare; p++) {
        const y = baseY - 10 - (hoehe * (p + 0.65)) / (paare + 0.25);
        const gr = (stage === 0 ? 10 : 13) - p * 1.8;
        const neigung = 0.42 - p * 0.06;
        for (let seite = -1; seite <= 1; seite += 2) {
          const lx = cx + seite * (7 + p * 0.8);
          const spitze = gr * 1.5;
          inkLine(g, lx, y,
            lx + seite * spitze * Math.cos(neigung), y - spitze * Math.sin(neigung),
            { width: 1.1, bend: seite * 0.14, seed: seed + 80 + p * 3 + (seite > 0 ? 1 : 0),
              color: ink.lineSoft, alpha: 0.5 });
        }
      }
      // Krümel am Beetrand
      const rng = makeRng(seed + 90);
      g.save();
      g.globalAlpha = 0.42;
      g.fillStyle = ink.dirtDark;
      g.beginPath();
      for (let i = 0; i < 5; i++) {
        const x = cx - 20 + rng() * 40;
        const y = baseY - 8 + rng() * 6;
        g.moveTo(x + 2, y);
        g.ellipse(x, y, 2 + rng(), 1.4 + rng() * 0.6, 0, 0, Math.PI * 2);
      }
      g.fill();
      g.restore();
      for (let i = 0; i < fruechte.length; i++) {
        dot(null, g, fruechte[i][0], fruechte[i][1], fruchtR,
          fruitColor, seed + 60 + i);
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

/**
 * Saatbeutel – das Symbol für eine Saat.
 *
 * Ein Leinenbeutel mit farbiger Schnur; die Farbe sagt, was daraus wird. Die
 * reife Pflanze als Symbol zu nehmen wäre naheliegend gewesen, aber dann sähe
 * die Saat in der Tasche genauso aus wie die Ernte daneben.
 */
export function paintSeedPouch(opts) {
  const o = opts || {};
  const w = 64;
  const h = 68;
  const seed = o.seed || 451;
  const cx = w / 2;
  const baseY = h - 10;
  const band = o.band || ink.berry;

  const sack = smoothClosed(blob(cx, baseY - 18, 18, 17, seed, 0.14, 14), 5);
  const hals = smoothClosed([
    [cx - 7, baseY - 33], [cx - 5, baseY - 42], [cx + 5, baseY - 42], [cx + 7, baseY - 33],
  ], 4);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.1,
    outline: 1.6,
    shadow: function (g) { groundShadow(g, cx + 2, baseY - 2, 19, 7, seed + 1, 0.14); },
    wash: function (g) {
      wash(g, sack, '#e0d3b2', { seed: seed + 2, scale: 1.05 });
      wash(g, offsetShape(sack, -LIGHT.x * 8, -LIGHT.y * 7, 0.72), '#c3b28c', { alpha: 0.55 });
      wash(g, hals, '#d6c8a4', { seed: seed + 3 });
      // Ein breites farbiges Band quer über den Beutel.
      //
      // Erst nur eine dünne Schnur am Hals – bei Symbolgröße zwei Pixel, und
      // die vier Saaten sahen in der Tasche alle gleich aus. Die Farbe muss
      // Fläche haben, sonst sagt sie nichts.
      // Auf den Beutel, nicht daneben: die Lasur ist weichgezeichnet und
      // stünde sonst als farbiger Hof über der Kontur.
      clipTo(g, [sack]);
      wash(g, smoothClosed([
        [cx - 19, baseY - 22], [cx + 19, baseY - 24],
        [cx + 19, baseY - 13], [cx - 19, baseY - 11],
      ], 4), band, { seed: seed + 4, alpha: 0.92 });
      g.restore();
      // Und ein Büschel derselben Farbe schaut oben heraus
      const buschel = smoothClosed(blob(cx, baseY - 44, 9, 6, seed + 5, 0.24, 12), 4);
      clipTo(g, [buschel]);
      wash(g, buschel, band, { seed: seed + 6, alpha: 0.85 });
      g.restore();
    },
    shape: function (g) {
      fill(g, sack);
      fill(g, hals);
      fill(g, smoothClosed(blob(cx, baseY - 44, 9, 6, seed + 5, 0.24, 12), 4));
    },
    ink: function (g) {
      // Die Schnur, die das Band zusammenhält
      g.save();
      g.strokeStyle = ink.line;
      g.globalAlpha = 0.7;
      g.lineWidth = 2.6;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(cx - 8, baseY - 34);
      g.quadraticCurveTo(cx, baseY - 31, cx + 8, baseY - 34);
      g.stroke();
      g.restore();
      inkLine(g, cx - 9, baseY - 24, cx - 4, baseY - 12,
        { width: 1.3, bend: 0.2, seed: seed + 10, color: ink.lineSoft, alpha: 0.5 });
      inkLine(g, cx + 8, baseY - 26, cx + 3, baseY - 13,
        { width: 1.3, bend: -0.2, seed: seed + 11, color: ink.lineSoft, alpha: 0.45 });
    },
  });
  return made(res, w, h, cx, baseY);
}
