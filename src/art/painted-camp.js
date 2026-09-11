/**
 * Gemalte Bauten, Deko, Werkzeuge und Figuren.
 * Gleicher Aufbau wie die Naturobjekte: Schatten, Farbflächen, Silhouette,
 * Innenlinien – und beide Fassungen (koloriert / Zeichnung) auf einmal.
 */
import {
  blob, teardrop, smoothClosed, offsetShape, pathFrom, clipTo,
  inkStroke, inkLine, wash, paintObject, groundShadow, LIGHT,
} from './brush.js';
import { INK as ink, fill, made, dot, slab, poly, quad } from './painted.js';
import { makeRng } from '../core/rng.js';

/**
 * Seli – die Spielfigur. Blond, warme Erdtöne, ein Tupfen Türkis,
 * damit sie sich vom gelbgrünen Boden abhebt.
 */
export const SELI = {
  hair: '#f0cf7e',
  hairShade: '#d3a94f',
  hairLight: '#fbeaad',
  top: '#7fb0bd',
  topShade: '#5b8c9a',
  skirt: '#e0836d',
  skirtShade: '#bb6150',
  tights: '#e8dcc2',
  scarf: '#f2c063',
  hat: '#c98a4c',
  hatShade: '#a06a37',
  boot: '#8c6a4a',
  pack: '#9fa877',
  packShade: '#7d8659',
  // Blaue Augen. Der Ton ist bewusst tief und leicht grünstichig statt
  // leuchtend: Das Auge ist sieben mal zehn Pixel groß, und ein helles Blau
  // auf dieser Fläche verliert gegen die dunkle Kontur ringsum – man sähe nur
  // einen grauen Fleck. So bleibt es dunkel genug, um als Auge zu lesen, und
  // hell genug, um blau zu sein.
  eye: '#3d6f9e',
  eyeDeep: '#24405c',
};

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
    blur: 1.5,
    outline: 1.7,
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
  const h = 146;
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
    blur: 2.0,
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
  return made({ color: res.color, line: res.color, margin: res.margin }, w, h, cx, baseY);
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
    blur: 2.0,
    outline: 2.2,
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

/**
 * Das Ruderboot am Sund.
 *
 * Von schräg oben, wie alles hier: ein Rumpf mit hochgezogenem Bug, zwei
 * Duchten quer darin, und ein Riemen, der über die Bordwand hinausragt.
 *
 * Der Riemen gehört bewusst ZUR Silhouette. Als er nur eine Tuschelinie im
 * Boot war, sah das Boot aus wie eine flache Schale mit zwei Ringen darin –
 * erst das herausstehende Blatt macht daraus etwas, mit dem man rudert.
 */
export function paintBoat(opts) {
  const o = opts || {};
  const w = 288;
  const h = 200;
  const seed = o.seed || 391;
  const cx = w / 2;
  const baseY = h - 26;

  const rumpf = smoothClosed([
    [cx - 118, baseY - 34], [cx - 98, baseY - 64], [cx - 24, baseY - 74],
    [cx + 74, baseY - 66], [cx + 120, baseY - 36], [cx + 76, baseY - 2],
    [cx - 74, baseY - 8],
  ], 8);
  const innen = smoothClosed([
    [cx - 96, baseY - 34], [cx - 80, baseY - 56], [cx - 22, baseY - 62],
    [cx + 62, baseY - 56], [cx + 98, baseY - 36], [cx + 62, baseY - 14],
    [cx - 60, baseY - 20],
  ], 8);
  const bankL = smoothClosed([
    [cx - 60, baseY - 54], [cx - 40, baseY - 57], [cx - 36, baseY - 22], [cx - 56, baseY - 19],
  ], 4);
  const bankR = smoothClosed([
    [cx + 14, baseY - 57], [cx + 34, baseY - 56], [cx + 38, baseY - 21], [cx + 18, baseY - 22],
  ], 4);
  // Riemen: Schaft aus dem Boot heraus nach links oben, Blatt am Ende
  const ruder = smoothClosed([
    [cx + 6, baseY - 34], [cx + 12, baseY - 42],
    [cx - 116, baseY - 84], [cx - 122, baseY - 76],
  ], 4);
  const blatt = smoothClosed(blob(cx - 132, baseY - 82, 17, 11, seed + 9, 0.12, 14), 5);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.8,
    outline: 2.2,
    shadow: function (g) { groundShadow(g, cx, baseY - 6, 110, 17, seed, 0.15); },
    wash: function (g) {
      wash(g, rumpf, ink.wood, { seed: seed + 2, scale: 1.03 });
      wash(g, offsetShape(rumpf, 34, 10, 0.7), ink.woodDark, { seed: seed + 3, alpha: 0.6 });
      wash(g, innen, '#c9a479', { seed: seed + 4, scale: 1.02 });
      wash(g, offsetShape(innen, -30, -8, 0.6), '#dbbb95', { seed: seed + 5, alpha: 0.5 });
      wash(g, bankL, ink.woodDark, { seed: seed + 6 });
      wash(g, bankR, ink.woodDark, { seed: seed + 7 });
      wash(g, ruder, ink.wood, { seed: seed + 8 });
      wash(g, blatt, ink.woodDark, { seed: seed + 9, scale: 1.04 });
    },
    shape: function (g) {
      fill(g, rumpf);
      fill(g, ruder);
      fill(g, blatt);
    },
    ink: function (g) {
      inkStroke(g, innen, { width: 2.6, vary: 0.3, seed: seed + 12, color: ink.line, alpha: 0.9 });
      inkStroke(g, bankL, { width: 2.2, vary: 0.3, seed: seed + 13, color: ink.line, alpha: 0.85 });
      inkStroke(g, bankR, { width: 2.2, vary: 0.3, seed: seed + 14, color: ink.line, alpha: 0.85 });
      inkStroke(g, blatt, { width: 2.2, vary: 0.3, seed: seed + 15, color: ink.line, alpha: 0.85 });
      // Plankenfugen im Rumpf, unterhalb der Bordwand
      for (let i = 0; i < 2; i++) {
        inkLine(g, cx - 100 + i * 8, baseY - 24 + i * 6, cx + 100 - i * 8, baseY - 20 + i * 6,
          { width: 1.4, bend: 0.07, seed: seed + 20 + i, color: ink.lineSoft, alpha: 0.45 });
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

/**
 * Der Briefkasten am Lager.
 *
 * Pfosten, Kasten, Klappe – und die Fahne oben. Die Fahne ist das ganze
 * Zeichen: Sie sagt „da liegt was" und macht aus einem Pfosten mit Kiste
 * einen Briefkasten.
 */
export function paintMailbox(opts) {
  const o = opts || {};
  const w = 150;
  const h = 210;
  const seed = o.seed || 411;
  const cx = w / 2;
  const baseY = h - 16;

  const pfosten = smoothClosed([
    [cx - 9, baseY], [cx - 7, baseY - 74], [cx + 7, baseY - 74], [cx + 9, baseY],
  ], 4);
  const kasten = smoothClosed([
    [cx - 36, baseY - 74], [cx - 33, baseY - 128], [cx + 33, baseY - 128],
    [cx + 36, baseY - 74],
  ], 6);
  // Wenig geglättet: Die Klappe soll eckig bleiben. Mit derselben Rundung wie
  // der Kasten wurde sie zu einer Ellipse darin und sah aus wie ein Fenster.
  const klappe = smoothClosed([
    [cx - 23, baseY - 82], [cx - 22, baseY - 118], [cx + 22, baseY - 118],
    [cx + 23, baseY - 82],
  ], 2);
  const fahne = smoothClosed([
    [cx + 36, baseY - 132], [cx + 62, baseY - 124], [cx + 36, baseY - 110],
  ], 4);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.7,
    outline: 2.1,
    shadow: function (g) { groundShadow(g, cx, baseY - 2, 34, 11, seed, 0.16); },
    wash: function (g) {
      wash(g, pfosten, ink.wood, { seed: seed + 2, scale: 1.04 });
      wash(g, kasten, '#8fb0bd', { seed: seed + 3, scale: 1.03 });
      wash(g, offsetShape(kasten, 22, 8, 0.7), '#6d8e9c', { seed: seed + 4, alpha: 0.6 });
      wash(g, klappe, '#e6ddc9', { seed: seed + 5 });
      wash(g, fahne, ink.berry, { seed: seed + 6, scale: 1.05 });
    },
    shape: function (g) {
      fill(g, pfosten);
      fill(g, kasten);
      fill(g, fahne);
    },
    ink: function (g) {
      inkStroke(g, klappe, { width: 2.8, vary: 0.25, seed: seed + 12, color: ink.line, alpha: 0.95 });
      // Griff an der Klappe – ohne ihn ist es ein aufgemaltes Rechteck
      inkLine(g, cx - 9, baseY - 95, cx + 9, baseY - 95,
        { width: 3.0, bend: 0.16, seed: seed + 13, color: ink.line, alpha: 0.9 });
      // Der Mast der Fahne
      inkLine(g, cx + 36, baseY - 134, cx + 36, baseY - 104,
        { width: 2.4, bend: 0, seed: seed + 14, color: ink.line, alpha: 0.9 });
    },
  });
  return made(res, w, h, cx, baseY);
}

/**
 * Das Zuhause in seinen Ausbaustufen.
 *
 * Drei Häuser aus einem Bauplan: Wand, Giebel, Satteldach, Tür, Fenster – und
 * je nach Stufe kommt etwas dazu (zweites Fenster, Schornstein, Giebelfenster,
 * Veranda mit Laternen). So bleiben sie unverkennbar dasselbe Haus und wachsen
 * trotzdem sichtbar.
 *
 * Drei Dinge sind hier mit Absicht so und nicht anders:
 *
 * 1. **Wand und Schornstein entstehen mit `slab`.** Ein Haus hat Ecken. Rund
 *    gezeichnet las sich die Wand wie ein Brotlaib – genau der Grund, aus dem
 *    auch die Theke des Marktstands aus Platten besteht.
 * 2. **Der Giebel ist eine eigene Fläche.** Das Dach ist ein Band, kein
 *    gefülltes Dreieck. Ohne Giebel klafft zwischen Dachunterkante und
 *    Wandoberkante ein Loch; auf Stufe 2 deckte das breite Band es zufällig
 *    zu, auf Stufe 4 stand der Hintergrund mitten im Haus.
 * 3. **Der Schornstein sitzt auf der Dachschräge.** Seine Höhe wird aus
 *    `dachY` gerechnet und sein Fuß liegt unter dem Dach, das danach darüber
 *    gemalt wird. Auf fester Höhe gesetzt schwebte er über dem First.
 *
 * `stage` ist 2, 3 oder 4; Stufe 1 ist das Zelt und hat seinen eigenen Maler.
 */
export function paintHouse(stage, opts) {
  const o = opts || {};
  // Die Maße je Stufe ausgeschrieben statt in geschachtelten Fragezeichen:
  // Beim Haus hängt jede Zahl an der nächsten, und Vordach, Tür und Fenster
  // gehen sich nur aus dem Weg, wenn man sie nebeneinander sieht.
  //
  // Gemessen an der bemalten Fläche, nicht an der Leinwand: Das Zelt ist
  // 324 × 266 groß. Ein erster Entwurf gab der Hütte 240 × 177 – der Umzug
  // vom Zelt ins Haus hätte das Zuhause also kleiner gemacht. Die Wände
  // stehen deshalb von Anfang an hoch, und jede Stufe legt sichtbar zu.
  const L = stage >= 4
    ? { w: 430, h: 420, halb: 150, wandH: 200, sockel: 32, giebelH: 100, tuerH: 58, tuerW: 34, fenY: 20, fenW: 52, fenH: 50 }
    : stage === 3
      ? { w: 380, h: 360, halb: 136, wandH: 178, sockel: 0, giebelH: 92, tuerH: 70, tuerW: 30, fenY: 24, fenW: 46, fenH: 44 }
      : { w: 340, h: 320, halb: 120, wandH: 152, sockel: 0, giebelH: 84, tuerH: 66, tuerW: 27, fenY: 24, fenW: 44, fenH: 42 };

  const w = L.w;
  const h = L.h;
  const halb = L.halb;
  const seed = o.seed || (600 + stage * 31);
  const cx = w / 2;
  const baseY = h - 16;
  // Auf Stufe 4 steht das Haus auf der Veranda, nicht direkt auf dem Boden.
  const wandFuss = baseY - L.sockel;
  const traufe = wandFuss - L.wandH;
  const first = traufe - L.giebelH;
  const UEBER = 20;

  /** Oberkante des Dachs im Abstand dx von der Mitte. */
  function dachY(dx) {
    const t = Math.min(1, Math.abs(dx) / (halb + UEBER));
    return first + (traufe + 10 - first) * t;
  }

  const wand = slab(cx - halb, traufe, cx + halb, wandFuss, seed + 1, 2.0);
  const giebel = poly([
    [cx - halb + 2, traufe + 4], [cx, first + 18], [cx + halb - 2, traufe + 4],
  ], 2);
  // Satteldach als Band mit Überstand – die Kante bleibt scharf.
  const dach = poly([
    [cx - halb - UEBER, traufe + 10], [cx, first],
    [cx + halb + UEBER, traufe + 10], [cx + halb + 6, traufe + 22],
    [cx, first + 26], [cx - halb - 6, traufe + 22],
  ], 2);
  const tuer = slab(cx - L.tuerW, wandFuss - L.tuerH, cx + L.tuerW, wandFuss, seed + 2, 1.2);
  // Die Fenster sitzen im Verhältnis zur Wandbreite, nicht auf fester Höhe:
  // Sonst rutschen sie mit jeder Stufe weiter in die Mitte und lassen an den
  // Seiten leere Wand stehen.
  const fenX = Math.round(halb * 0.34);
  const fenY0 = traufe + L.fenY;
  const fenY1 = fenY0 + L.fenH;
  const fenster = slab(cx + fenX, fenY0, cx + fenX + L.fenW, fenY1, seed + 3, 1.0);
  const fenster2 = stage >= 3
    ? slab(cx - fenX - L.fenW, fenY0, cx - fenX, fenY1, seed + 4, 1.0) : null;

  // Schornstein: rechts vom First, mit dem Fuß im Dach.
  const sx0 = cx + halb * 0.30;
  const sx1 = sx0 + 34;
  const schlotOben = dachY(sx0 - cx) - 46;
  const schlot = stage >= 3
    ? slab(sx0, schlotOben + 8, sx1, dachY(sx1 - cx) + 16, seed + 5, 1.4) : null;
  const kappe = stage >= 3
    ? slab(sx0 - 6, schlotOben - 2, sx1 + 6, schlotOben + 12, seed + 6, 1.2) : null;
  const lukeY = first + 54;
  const luke = stage >= 3
    ? smoothClosed(blob(cx, lukeY, 15, 15, seed + 7, 0.12, 12), 4) : null;

  // Veranda: Dielen bis vor die Wand, zwei Pfosten außerhalb der Wandkante,
  // ein Vordach breiter als das Haus. Nach innen gezeichnet verschwand alles
  // davon in der Wand – gleiche Farbe, gleiche Fläche, kein Umriss.
  const dielen = stage >= 4 ? poly([
    [cx - halb - 22, wandFuss - 2], [cx + halb + 22, wandFuss - 2],
    [cx + halb + 32, baseY - 2], [cx - halb - 32, baseY - 2],
  ], 2) : null;
  const vordach = stage >= 4
    ? slab(cx - halb - 28, traufe + 80, cx + halb + 28, traufe + 98, seed + 8, 1.8) : null;
  const pfosten = stage >= 4 ? [
    slab(cx - halb - 8, traufe + 96, cx - halb + 8, wandFuss - 2, seed + 9, 1.2),
    slab(cx + halb - 8, traufe + 96, cx + halb + 8, wandFuss - 2, seed + 10, 1.2),
  ] : [];
  // Die Laternen brauchen eine Farbfläche. Nur getuscht wären sie leere Ringe:
  // `dot` malt ohne Wash-Ebene bloß den Umriss.
  const laternenY = traufe + 116;
  const laternen = stage >= 4
    ? [cx - halb + 46, cx + halb - 46].map(function (lx, i) {
      return smoothClosed(blob(lx, laternenY, 9, 10, seed + 11 + i, 0.12, 10), 4);
    }) : [];

  const res = paintObject(w, h, {
    seed: seed,
    blur: 2.0,
    outline: 2.3,
    shadow: function (g) {
      groundShadow(g, cx, baseY - 3, halb + (stage >= 4 ? 36 : 14), 20, seed, 0.17);
    },
    wash: function (g) {
      if (dielen) {
        // Deutlich kühleres Holz als die Wand: In Wandfarbe las sich die
        // Veranda als Sockel, auf dem das Haus steht, nicht als Boden davor.
        wash(g, dielen, '#c6a479', { seed: seed + 11, scale: 1.01 });
        wash(g, offsetShape(dielen, 0, 16, 0.72), '#a3835a', { seed: seed + 12, alpha: 0.55 });
      }
      wash(g, wand, '#e0c49c', { seed: seed + 13, scale: 1.02 });
      wash(g, offsetShape(wand, 52, 8, 0.62), '#c39f74', { seed: seed + 14, alpha: 0.6 });
      // Der Giebel ist dieselbe Wand, nur höher: gleiche Farbe, eigener
      // Schatten. In einem eigenen Ton las er sich als Fleck im Dach.
      wash(g, giebel, '#e0c49c', { seed: seed + 15, scale: 1.02 });
      wash(g, offsetShape(giebel, 26, 4, 0.62), '#c9a87e', { seed: seed + 29, alpha: 0.55 });
      // Schornstein vor dem Dach: Was danach kommt, deckt seinen Fuß zu.
      if (schlot) {
        wash(g, schlot, '#b0a596', { seed: seed + 16, scale: 1.02 });
        wash(g, offsetShape(schlot, 18, 4, 0.55), '#8d8274', { seed: seed + 17, alpha: 0.6 });
      }
      wash(g, dach, stage >= 4 ? '#8a6242' : '#a2704a', { seed: seed + 18, scale: 1.02 });
      wash(g, offsetShape(dach, 44, 8, 0.6), '#6f4a30', { seed: seed + 19, alpha: 0.55 });
      if (kappe) wash(g, kappe, '#9a8f80', { seed: seed + 20, scale: 1.02 });
      wash(g, tuer, '#75512f', { seed: seed + 21, scale: 1.02 });
      // Warmes Fenster statt Glas: Von außen sieht man das Licht darin.
      wash(g, fenster, '#f4d488', { seed: seed + 22, scale: 1.03 });
      if (fenster2) wash(g, fenster2, '#f4d488', { seed: seed + 23, scale: 1.03 });
      if (luke) wash(g, luke, '#f0cd82', { seed: seed + 24, scale: 1.03 });
      for (let i = 0; i < pfosten.length; i++) {
        wash(g, pfosten[i], ink.wood, { seed: seed + 25 + i, scale: 1.02 });
      }
      if (vordach) {
        wash(g, vordach, '#7d573b', { seed: seed + 27, scale: 1.02 });
        wash(g, offsetShape(vordach, 0, 8, 0.55), '#5f4029', { seed: seed + 28, alpha: 0.55 });
      }
      for (let i = 0; i < laternen.length; i++) {
        wash(g, laternen[i], '#f7d98c', { seed: seed + 30 + i, scale: 1.05 });
      }
    },
    shape: function (g) {
      if (dielen) fill(g, dielen);
      fill(g, wand);
      fill(g, giebel);
      if (schlot) fill(g, schlot);
      if (kappe) fill(g, kappe);
      fill(g, dach);
      for (let i = 0; i < pfosten.length; i++) fill(g, pfosten[i]);
      if (vordach) fill(g, vordach);
    },
    ink: function (g) {
      inkStroke(g, tuer, { width: 2.8, vary: 0.28, seed: seed + 30, color: ink.line, alpha: 0.95 });
      inkStroke(g, fenster, { width: 2.6, vary: 0.28, seed: seed + 31, color: ink.line, alpha: 0.92 });
      if (fenster2) {
        inkStroke(g, fenster2, { width: 2.6, vary: 0.28, seed: seed + 32, color: ink.line, alpha: 0.92 });
      }
      if (luke) {
        inkStroke(g, luke, { width: 2.4, vary: 0.25, seed: seed + 33, color: ink.line, alpha: 0.9 });
        inkLine(g, cx - 14, lukeY, cx + 14, lukeY,
          { width: 1.8, bend: 0.03, seed: seed + 34, alpha: 0.75 });
      }
      // Fensterkreuz – ohne es bleibt das Fenster ein gelber Fleck
      function kreuz(x0, x1, sd) {
        inkLine(g, x0, (fenY0 + fenY1) / 2, x1, (fenY0 + fenY1) / 2,
          { width: 1.9, bend: 0.03, seed: sd, alpha: 0.8 });
        inkLine(g, (x0 + x1) / 2, fenY0, (x0 + x1) / 2, fenY1,
          { width: 1.9, bend: 0.03, seed: sd + 1, alpha: 0.8 });
      }
      kreuz(cx + fenX, cx + fenX + L.fenW, seed + 36);
      if (fenster2) kreuz(cx - fenX - L.fenW, cx - fenX, seed + 38);
      dot(null, g, cx + L.tuerW * 0.55, wandFuss - L.tuerH * 0.45, 3.6, ink.iron, seed + 40);

      // Bretter in der Wand
      for (let i = 1; i < 4; i++) {
        const y = traufe + (L.wandH / 4) * i;
        inkLine(g, cx - halb + 8, y, cx + halb - 8, y,
          { width: 1.3, bend: 0.04, seed: seed + 42 + i, color: ink.lineSoft, alpha: 0.42 });
      }
      // Der Giebel trägt stehende Bretter – quer verlaufende würden ihn zur
      // Fortsetzung der Wand machen, und genau das ist er nicht.
      inkLine(g, cx - halb + 10, traufe + 3, cx + halb - 10, traufe + 3,
        { width: 1.8, bend: 0.03, seed: seed + 46, color: ink.lineSoft, alpha: 0.55 });
      for (let i = -2; i <= 2; i++) {
        if (!i) continue;
        const x = cx + i * (halb / 3.2);
        // Bis zur Dachschräge, nicht darüber hinaus
        const oben = first + 18 + (traufe - 14 - first) * Math.min(1, Math.abs(x - cx) / halb);
        inkLine(g, x, oben + 8, x, traufe,
          { width: 1.3, bend: 0.03, seed: seed + 47 + i, color: ink.lineSoft, alpha: 0.4 });
      }
      // Schindelstriche quer zur Dachschräge – waagerechte Latten würden über
      // den Giebel laufen, der ja unter dem Dachband liegt und sichtbar ist.
      for (let s = -1; s <= 1; s += 2) {
        for (let i = 1; i <= 4; i++) {
          const u = i / 5;
          inkLine(g,
            cx + s * (halb + UEBER) * u, first + (traufe + 10 - first) * u,
            cx + s * (halb + 6) * u, first + 26 + (traufe - 4 - first) * u,
            { width: 1.4, bend: 0.02, seed: seed + 50 + i * 3 + s, color: ink.lineSoft, alpha: 0.4 });
        }
      }
      if (kappe) {
        inkLine(g, sx0 - 6, schlotOben + 11, sx1 + 6, schlotOben + 11,
          { width: 2.0, bend: 0.03, seed: seed + 60, color: ink.line, alpha: 0.85 });
      }
      if (stage >= 4) {
        // Zwei Laternen am Vordach, jede an ihrem Haken
        for (let i = 0; i < laternen.length; i++) {
          const lx = i ? cx + halb - 46 : cx - halb + 46;
          inkLine(g, lx, traufe + 98, lx, laternenY - 9,
            { width: 1.8, bend: 0, seed: seed + 62 + i, alpha: 0.8 });
          inkStroke(g, laternen[i],
            { width: 2.0, vary: 0.28, seed: seed + 64 + i, color: ink.line, alpha: 0.9 });
        }
        // Die Naht zwischen Wand und Veranda – ohne sie steht das Haus auf
        // einem Sockel statt vor einem Boden.
        inkLine(g, cx - halb - 20, wandFuss - 1, cx + halb + 20, wandFuss - 1,
          { width: 2.2, bend: 0.02, seed: seed + 68, color: ink.line, alpha: 0.75 });
        // Dielenfugen, nach vorn hin breiter
        for (let i = 1; i < 4; i++) {
          const t = i / 4;
          const y = wandFuss + (baseY - wandFuss - 4) * t;
          const rand = halb + 22 + 10 * t;
          inkLine(g, cx - rand, y, cx + rand, y,
            { width: 1.2, bend: 0.03, seed: seed + 70 + i, color: ink.lineSoft, alpha: 0.38 });
        }
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

export function paintStall(opts) {
  const o = opts || {};
  const w = 366;
  const h = 252;
  const seed = o.seed || 351;
  const cx = w / 2;
  const baseY = h - 14;

  // Theke aus zwei Flächen: eine Platte, auf die man von schräg oben sieht,
  // und die Front darunter. Als einzelner abgerundeter Kasten las sich das
  // Ganze wie ein Brotlaib.
  const topY = baseY - 66;
  const frontY = baseY - 48;
  const plate = smoothClosed([
    [cx - 130, frontY + 2], [cx - 124, topY + 3], [cx - 60, topY],
    [cx + 60, topY], [cx + 124, topY + 3], [cx + 130, frontY + 2],
    [cx + 100, frontY + 9], [cx, frontY + 11], [cx - 100, frontY + 9],
  ], 3);
  const counter = slab(cx - 126, frontY - 2, cx + 126, baseY - 8, seed + 90, 2.2);
  const postL = slab(cx - 132, frontY, cx - 114, 84, seed + 91, 1.4);
  const postR = slab(cx + 114, frontY, cx + 132, 84, seed + 92, 1.4);
  // Gewölbtes Dach statt einer dünnen Linse: oben in der Mitte am höchsten,
  // die Unterkante hängt leicht durch – so liest es sich als Markise, und die
  // Streifen haben Platz.
  const roof = smoothClosed([
    [cx - 156, 94], [cx - 148, 54], [cx - 70, 40], [cx, 36], [cx + 70, 40],
    [cx + 148, 54], [cx + 156, 94],
    [cx + 80, 86], [cx, 82], [cx - 80, 86],
  ], 4);
  // Die Zacken hängen an der Dachkante, sonst schweben sie wie eine Girlande
  const scallops = [];
  for (let i = 0; i < 8; i++) {
    const x = cx - 152 + i * 38 + 19;
    const hang = 84 + Math.abs(x - cx) * 0.05;
    scallops.push(smoothClosed([
      [x - 19, hang - 6], [x + 19, hang - 6], [x + 12, hang + 20], [x, hang + 26], [x - 12, hang + 20],
    ], 6));
  }

  const res = paintObject(w, h, {
    seed: seed,
    blur: 2.0,
    outline: 2.1,
    shadow: function (g) { groundShadow(g, cx, baseY - 3, 140, 20, seed, 0.16); },
    wash: function (g) {
      wash(g, postL, ink.wood, { seed: seed + 20 });
      wash(g, offsetShape(postL, 6, 0, 0.5), ink.woodDark, { seed: seed + 25, alpha: 0.55 });
      wash(g, postR, ink.wood, { seed: seed + 21 });
      wash(g, offsetShape(postR, 6, 0, 0.5), ink.woodDark, { seed: seed + 26, alpha: 0.55 });
      // Front dunkler als die Platte – daher kommt die Tiefe
      wash(g, counter, ink.woodDark, { seed: seed + 22, scale: 1.03 });
      wash(g, offsetShape(counter, 0, 26, 0.92), '#9c7d4e', { seed: seed + 23, alpha: 0.55 });
      wash(g, plate, '#e8cb9c', { seed: seed + 27, scale: 1.02 });
      wash(g, offsetShape(plate, 0, 7, 0.96), ink.wood, { seed: seed + 28, alpha: 0.5 });
      wash(g, roof, '#f3ece0', { seed: seed + 24 });
      // Streifen laufen über das ganze Dach durch, nicht nur über die Zacken –
      // erst dadurch liest sich das Dach als Markise.
      g.save();
      pathFrom(g, roof, true);
      g.clip();
      for (let i = 0; i < 8; i++) {
        if (i % 2) continue;
        const x = cx - 152 + i * 38;
        g.globalAlpha = 0.9;
        g.fillStyle = ink.berry;
        pathFrom(g, [[x, 30], [x + 38, 30], [x + 38, 118], [x, 118]], true);
        g.fill();
      }
      g.restore();
      for (let i = 0; i < scallops.length; i++) {
        wash(g, scallops[i], i % 2 ? '#f5eee2' : ink.berry, { seed: seed + 30 + i });
      }
      // Ware liegt auf der Platte und wirft dort einen kleinen Schatten
      const goods = [
        [cx - 78, topY - 12, 17, ink.petalYellow, 60],
        [cx - 40, topY - 9, 14, ink.leaf, 61],
        [cx + 50, topY - 12, 16, ink.berry, 62],
        [cx + 84, topY - 8, 12, ink.petalViolet, 63],
      ];
      g.save();
      g.globalAlpha = 0.22;
      g.fillStyle = '#6f5b3c';
      for (let i = 0; i < goods.length; i++) {
        const q = goods[i];
        fill(g, smoothClosed(blob(q[0] + 6, q[1] + q[2] * 0.75, q[2] * 0.9, q[2] * 0.34,
          seed + 200 + i, 0.14, 12), 4));
      }
      g.restore();
      for (let i = 0; i < goods.length; i++) {
        const q = goods[i];
        dot(g, null, q[0], q[1], q[2], q[3], seed + q[4]);
      }
    },
    shape: function (g) {
      fill(g, postL); fill(g, postR); fill(g, counter); fill(g, plate); fill(g, roof);
      for (let i = 0; i < scallops.length; i++) fill(g, scallops[i]);
    },
    ink: function (g) {
      for (let i = 0; i < scallops.length; i++) {
        inkStroke(g, scallops[i], { width: 1.8, vary: 0.3, seed: seed + 70 + i, color: ink.line, alpha: 0.5 });
      }
      inkLine(g, cx - 152, 88, cx + 152, 88, { width: 2.4, bend: -0.03, seed: seed + 78, alpha: 0.75 });
      // Vorderkante der Platte – die Linie macht aus zwei Flächen eine Theke
      inkLine(g, cx - 126, frontY + 2, cx + 126, frontY + 2,
        { width: 2.4, bend: 0.01, seed: seed + 80, alpha: 0.7 });
      // Bretter der Front
      for (let i = 1; i < 6; i++) {
        const x = cx - 122 + i * 41;
        inkLine(g, x, frontY + 6, x - 2, baseY - 10,
          { width: 1.5, bend: 0.01, seed: seed + 84 + i, alpha: 0.32 });
      }
      inkLine(g, cx - 118, baseY - 22, cx + 118, baseY - 22, { width: 1.8, bend: 0.02, seed: seed + 81, alpha: 0.4 });
      dot(null, g, cx - 78, baseY - 78, 17, ink.petalYellow, seed + 60);
      dot(null, g, cx - 40, baseY - 75, 14, ink.leaf, seed + 61);
      dot(null, g, cx + 50, baseY - 78, 16, ink.berry, seed + 62);
      dot(null, g, cx + 84, baseY - 74, 12, ink.petalViolet, seed + 63);
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

  // Platte in zwei Flächen: die Oberseite, auf die man schaut, und die
  // Vorderkante darunter. Als eine gewölbte Fläche sah der Tisch aus wie ein
  // Brett auf zwei Würsten.
  const plateY = baseY - 82;
  const edgeY = baseY - 62;
  const plate = smoothClosed([
    [cx - 98, edgeY], [cx - 92, plateY + 3], [cx, plateY], [cx + 92, plateY + 3],
    [cx + 98, edgeY], [cx + 60, edgeY + 6], [cx - 60, edgeY + 6],
  ], 3);
  const top = slab(cx - 98, edgeY - 2, cx + 98, baseY - 50, seed + 60, 1.8);
  const legL = slab(cx - 84, baseY - 52, cx - 64, baseY - 4, seed + 61, 1.4);
  const legR = slab(cx + 64, baseY - 52, cx + 84, baseY - 4, seed + 62, 1.4);
  const vice = slab(cx + 40, baseY - 102, cx + 76, baseY - 82, seed + 63, 1.2);
  const sawBlade = smoothClosed([[cx - 84, baseY - 82], [cx - 26, baseY - 100], [cx - 20, baseY - 90], [cx - 80, baseY - 76]], 4);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.8,
    outline: 2.0,
    shadow: function (g) { groundShadow(g, cx, baseY - 3, 96, 15, seed, 0.15); },
    wash: function (g) {
      wash(g, legL, ink.woodDark, { seed: seed + 2 });
      wash(g, offsetShape(legL, 7, 0, 0.5), '#95764a', { seed: seed + 8, alpha: 0.55 });
      wash(g, legR, ink.woodDark, { seed: seed + 3 });
      wash(g, offsetShape(legR, 7, 0, 0.5), '#95764a', { seed: seed + 9, alpha: 0.55 });
      wash(g, top, ink.woodDark, { seed: seed + 4, scale: 1.03 });
      wash(g, plate, '#e3c692', { seed: seed + 5, scale: 1.02 });
      wash(g, offsetShape(plate, 0, 6, 0.96), ink.wood, { seed: seed + 15, alpha: 0.5 });
      wash(g, vice, ink.iron, { seed: seed + 6 });
      wash(g, offsetShape(vice, 6, 4, 0.6), ink.ironDark, { seed: seed + 16, alpha: 0.6 });
      wash(g, sawBlade, '#dfe4e8', { seed: seed + 7 });
    },
    shape: function (g) {
      fill(g, legL); fill(g, legR); fill(g, top); fill(g, plate); fill(g, vice); fill(g, sawBlade);
    },
    ink: function (g) {
      // Vorderkante der Platte
      inkLine(g, cx - 96, edgeY + 1, cx + 96, edgeY + 1,
        { width: 2.3, bend: 0.01, seed: seed + 10, alpha: 0.7 });
      inkStroke(g, vice, { width: 2.0, vary: 0.3, seed: seed + 11, color: ink.line, alpha: 0.7 });
      // Bretter der Platte
      for (let i = 1; i < 4; i++) {
        const x = cx - 98 + i * 49;
        inkLine(g, x, plateY + 3, x, edgeY - 1,
          { width: 1.4, bend: 0, seed: seed + 30 + i, alpha: 0.32 });
      }
      inkLine(g, cx - 80, baseY - 54, cx + 80, baseY - 54, { width: 1.5, bend: 0.02, seed: seed + 12, alpha: 0.35 });
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
    blur: 1.5,
    outline: 1.7,
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
    blur: 1.5,
    outline: 1.8,
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
    blur: 1.2,
    outline: 1.7,
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
    blur: 1.5,
    outline: 1.8,
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
    blur: 1.5,
    outline: 1.8,
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
    blur: 1.2,
    outline: 1.7,
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
    blur: 1.5,
    outline: 1.7,
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
    blur: 1.5,
    outline: 1.8,
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
    blur: 1.5,
    outline: 1.8,
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
    blur: 1.5,
    outline: 2.0,
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
  /**
   * Wandas Muschelkette: drei Muscheln an einer Schnur.
   *
   * Die Schnur ist eine Tuschelinie und gehört bewusst NICHT zur Silhouette –
   * sonst zieht die Umrisslinie einen dicken Bogen um nichts.
   */
  shellchain: function (g, gi, cx, cy, seed) {
    const links = smoothClosed(blob(cx - 20, cy + 8, 11, 12, seed + 1, 0.12, 12), 4);
    const mitte = smoothClosed(blob(cx + 1, cy + 16, 15, 15, seed + 2, 0.1, 14), 5);
    const rechts = smoothClosed(blob(cx + 22, cy + 8, 11, 12, seed + 3, 0.12, 12), 4);
    if (g) {
      wash(g, links, '#f0d9c4', { seed: seed + 4, scale: 1.05 });
      wash(g, mitte, '#f6e6d2', { seed: seed + 5, scale: 1.05 });
      wash(g, rechts, '#e9cbb4', { seed: seed + 6, scale: 1.05 });
      wash(g, offsetShape(mitte, 0, 4, 0.5), '#dcbb9e', { seed: seed + 7, alpha: 0.6 });
    }
    if (gi) {
      inkLine(gi, cx - 30, cy - 6, cx + 30, cy - 6, { width: 1.6, bend: 0.22, seed: seed + 8, alpha: 0.8 });
      // Rillen, sonst sind es drei Kiesel
      for (let i = -1; i <= 1; i++) {
        inkLine(gi, cx + 1 + i * 5, cy + 6, cx + 1 + i * 8, cy + 28,
          { width: 1.2, bend: 0.06, seed: seed + 10 + i, color: ink.lineSoft, alpha: 0.55 });
      }
    }
    return [links, mitte, rechts];
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
    blur: 1.2,
    outline: 1.7,
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
  /** Die Wassertropfen der Gießkanne – gefüllt gewaschen, dann umrandet. */
  let kanneTropfen = null;

  /** Ein runder Klecks als Form, ohne ihn gleich zu zeichnen. */
  function blobDot(x, y, r, s) {
    return smoothClosed(blob(x, y, r, r, s, 0.12, 10), 4);
  }

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
  } else if (kind === 'net') {
    // Stiel schräg, oben ein Ring, darin der Beutel. Der Beutel ist eine
    // eigene Form, damit die Silhouette einen Kescher ergibt und nicht
    // eine Kelle.
    shafts = [handle(cx - 30, cy + 46, cx + 4, cy - 8, 6)];
    heads = [smoothClosed(blob(cx + 14, cy - 30, 27, 24, seed + 3, 0.07, 18), 6)];
    headColor = ink.paper;
  } else if (kind === 'can') {
    // Bauch, Tülle und Bügel – alles aus einem Stück Blech, darum alles in
    // `heads`. Als die Tülle noch ein „Stiel" war, wurde sie holzfarben
    // gewaschen, und die Kanne sah aus wie ein Stein mit einem Kochlöffel.
    const bx = cx - 12;
    const by = cy + 6;
    // Die Tropfen fallen unter der Tüllenspitze – darum zeigt die Tülle nach
    // schräg unten. Zeigte sie nach oben, standen Kanne und Wasser in zwei
    // verschiedene Richtungen und das Bild erzählte nichts.
    kanneTropfen = [
      blobDot(bx + 47, by + 33, 4.4, seed + 71),
      blobDot(bx + 54, by + 42, 3.4, seed + 72),
      blobDot(bx + 40, by + 43, 2.8, seed + 73),
    ];
    // Der Bügel: außen herum und innen zurück, das ergibt ein Band statt
    // eines Klumpens. Ein gerader Strich darüber sah aus wie eine Latte.
    const buegel = [];
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI + (i / 12) * Math.PI;
      buegel.push([bx + Math.cos(a) * 27, (by - 22) + Math.sin(a) * 24]);
    }
    for (let i = 12; i >= 0; i--) {
      const a = Math.PI + (i / 12) * Math.PI;
      buegel.push([bx + Math.cos(a) * 19, (by - 22) + Math.sin(a) * 15]);
    }
    heads = [
      smoothClosed(blob(bx - 2, by + 2, 27, 24, seed + 5, 0.07, 18), 6),
      // Tülle: am Bauch breit, zur Brause hin schmal, schräg nach unten.
      smoothClosed([
        [bx + 14, by - 12], [bx + 16, by + 6],
        [bx + 52, by + 22], [bx + 49, by + 12],
      ], 4),
      // Die Brause sitzt als eigener Kopf am Ende. Ohne sie läuft die Tülle
      // spitz aus, und die Kanne bekommt einen Schnabel statt einer Brause.
      smoothClosed(blob(bx + 50, by + 18, 8, 9, seed + 9, 0.1, 12), 4),
      smoothClosed(buegel, 4),
    ];
    headColor = ink.iron;
  } else { // hand
    heads = [smoothClosed(blob(cx, cy + 4, 26, 30, seed, 0.14, 16), 5)];
    headColor = ink.skin;
  }

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.2,
    outline: 1.7,
    wash: function (g) {
      for (let i = 0; i < shafts.length; i++) wash(g, shafts[i], ink.wood, { seed: seed + 10 + i, scale: 1.04 });
      for (let i = 0; i < heads.length; i++) {
        wash(g, heads[i], headColor, { seed: seed + 20 + i, scale: 1.05 });
        wash(g, offsetShape(heads[i], 6, 5, 0.6), kind === 'hand' ? ink.skinShade : ink.ironDark,
          { seed: seed + 30 + i, alpha: 0.6 });
      }
      // Die Tropfen liegen NICHT in der Silhouette: sonst klebten sie als
      // Blechnasen an der Tülle, statt zu fallen.
      if (kanneTropfen) {
        for (let i = 0; i < kanneTropfen.length; i++) {
          wash(g, kanneTropfen[i], ink.water, { seed: seed + 60 + i, scale: 1.02 });
        }
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
      if (kind === 'net') {
        // Ring als kräftige Linie, darin ein Gitter aus dünnen Strichen:
        // ohne das Gitter wäre der Beutel eine weiße Blase.
        inkStroke(g, smoothClosed(blob(cx + 14, cy - 30, 27, 24, seed + 3, 0.07, 18), 6),
          { width: 2.6, vary: 0.25, seed: seed + 45, color: ink.woodDark, alpha: 0.95 });
        for (let i = -2; i <= 2; i++) {
          inkLine(g, cx + 14 + i * 10, cy - 52, cx + 14 + i * 8, cy - 8,
            { width: 1.1, bend: 0.05, seed: seed + 50 + i, color: ink.lineSoft, alpha: 0.42 });
          inkLine(g, cx - 12, cy - 30 + i * 9, cx + 40, cy - 30 + i * 9,
            { width: 1.1, bend: 0.08, seed: seed + 60 + i, color: ink.lineSoft, alpha: 0.42 });
        }
      }
      if (kind === 'can' && kanneTropfen) {
        // Der Rand der Brause, ein Naht­strich über dem Bauch – und die
        // Tropfen. Erst sie sagen, dass hier gegossen und nicht geschöpft
        // wird; ohne sie ist es eine Kanne wie jede andere.
        // Brausenrand quer zur Tülle, dazu eine Naht über dem Bauch.
        inkLine(g, cx + 34, cy + 16, cx + 42, cy + 30,
          { width: 2.6, bend: 0.04, seed: seed + 46, color: ink.ironDark, alpha: 0.9 });
        inkLine(g, cx - 34, cy - 4, cx + 2, cy - 4,
          { width: 1.4, bend: 0.09, seed: seed + 48, color: ink.ironDark, alpha: 0.5 });
        for (let i = 0; i < kanneTropfen.length; i++) {
          inkStroke(g, kanneTropfen[i],
            { width: 1.3, vary: 0.3, seed: seed + 50 + i, color: ink.waterDeep, alpha: 0.85 });
        }
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
    blur: 1.0,
    outline: 1.3,
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
    blur: 1.0,
    outline: 1.5,
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
 *
 * @param {'down'|'up'|'side'|'sit'} dir
 * @param {number} frame 0 = Stand, 1/2 = Schritt
 *
 * `sit` ist die vierte Haltung und die einzige, die nichts mit Laufen zu tun
 * hat: Seli sitzt auf einer Bank, im Gras oder in der Hängematte. Sie war
 * lange die auffälligste Lücke im Spiel – man baut sich eine Bank, stellt
 * sie ans Wasser und kann sich nie hineinsetzen.
 *
 * Technisch ist sie derselbe Körper, nur ein Stück tiefer (das erledigt `bob`
 * für alles, was daran hängt) und mit angewinkelten Beinen statt gestreckter.
 * Eine zweite Malroutine daneben wäre eine zweite Seli, die beim nächsten
 * Farbwechsel abweicht.
 */
export function paintSeli(dir, frame, opts) {
  const o = opts || {};
  const w = 124;
  const h = 168;
  const seed = (o.seed || 301) + frame * 5;
  const cx = w / 2;
  const baseY = h - 10;
  const headY = 56;
  const sit = dir === 'sit';
  // Im Sitzen sackt der ganze Oberkörper ab – über `bob`, an dem Kopf, Haar,
  // Hut, Rock, Arme und Halstuch ohnehin schon hängen.
  // Zwölf Pixel, nachgerechnet: Der Rockbund liegt dann bei baseY-40, der
  // Saum bei baseY-26 – vierzehn Pixel Rock. Bei zwanzig fielen Bund und
  // Saum aufeinander, und aus dem Rock wurde ein Strich.
  const bob = (frame === 0 ? 0 : -3) + (sit ? 12 : 0);
  const stepA = sit ? 0 : (frame === 1 ? 7 : 0);
  const stepB = sit ? 0 : (frame === 2 ? 7 : 0);
  const side = dir === 'side';
  const back = dir === 'up';

  const hair = o.hair || SELI.hair;
  const hairShade = o.hairShade || SELI.hairShade;
  const hairLight = o.hairLight || SELI.hairLight;

  // Beine schlank, Stiefel dunkel – helle Strümpfe allein verschwinden im Papier.
  // Im Sitzen liegen die Oberschenkel waagerecht nach vorn, die Unterschenkel
  // fallen davor herunter: von vorn zwei runde Knie und darunter die Stiefel.
  const legL = sit
    ? smoothClosed([
      [cx - 15, baseY - 26], [cx - 17, baseY - 12],
      [cx - 6, baseY - 11], [cx - 5, baseY - 25],
    ], 5)
    : smoothClosed([
      [cx - 12 - stepA * 0.4, baseY - 30 + bob], [cx - 13 - stepA * 0.6, baseY - 11],
      [cx - 3 - stepA * 0.6, baseY - 11], [cx - 3, baseY - 30 + bob],
    ], 4);
  const legR = sit
    ? smoothClosed([
      [cx + 5, baseY - 25], [cx + 6, baseY - 11],
      [cx + 17, baseY - 12], [cx + 15, baseY - 26],
    ], 5)
    : smoothClosed([
      [cx + 3, baseY - 30 + bob], [cx + 3 + stepB * 0.6, baseY - 11],
      [cx + 13 + stepB * 0.6, baseY - 11], [cx + 12 + stepB * 0.4, baseY - 30 + bob],
    ], 4);
  const bootL = sit
    ? smoothClosed(blob(cx - 12, baseY - 8, 9, 6, seed + 62, 0.09, 12), 4)
    : smoothClosed(blob(cx - 8 - stepA * 0.6, baseY - 7, 8.5, 6.5, seed + 62, 0.09, 12), 4);
  const bootR = sit
    ? smoothClosed(blob(cx + 12, baseY - 8, 9, 6, seed + 63, 0.09, 12), 4)
    : smoothClosed(blob(cx + 8 + stepB * 0.6, baseY - 7, 8.5, 6.5, seed + 63, 0.09, 12), 4);

  // Rock: unten weiter als oben, das liest sich auch klein noch als Kleid
  const skirtTop = baseY - 52 + bob;
  // Im Sitzen liegt der Rock auf dem Schoß: breiter und deutlich kürzer, sonst
  // verdeckt er die angewinkelten Beine ganz und die Haltung liest sich als
  // Hocke im Zelt.
  const skirt = sit
    ? smoothClosed([
      [cx - 15, skirtTop], [cx + 15, skirtTop],
      [cx + 26, baseY - 27], [cx + 14, baseY - 23],
      [cx, baseY - 26],
      [cx - 14, baseY - 23], [cx - 26, baseY - 27],
    ], 6)
    : smoothClosed([
      [cx - 13, skirtTop], [cx + 13, skirtTop],
      [cx + 22, baseY - 30 + bob], [cx + 14, baseY - 26 + bob],
      [cx, baseY - 29 + bob],
      [cx - 14, baseY - 26 + bob], [cx - 22, baseY - 30 + bob],
    ], 6);
  const body = smoothClosed(blob(cx, baseY - 60 + bob, side ? 19 : 22, 18, seed + 1, 0.06, 16), 5);
  const armL = smoothClosed(blob(cx - (side ? 15 : 22), baseY - 56 + bob + stepB, 7, 13, seed + 2, 0.08, 12), 5);
  const armR = smoothClosed(blob(cx + (side ? 15 : 22), baseY - 56 + bob + stepA, 7, 13, seed + 3, 0.08, 12), 5);
  const head = smoothClosed(blob(cx, headY + bob, 30, 29, seed + 4, 0.045, 20), 6);

  // Haar: schulterlanger Bob mit zwei Strähnen, die neben dem Hals fallen.
  // Der Einschnitt in der Mitte lässt Platz für Hals und Halstuch.
  const hairSide = side ? 4 : 0;
  const hairBack = back
    // Von hinten derselbe Bob wie von vorn: bis knapp unter die Schultern,
    // unten in drei weichen Spitzen. Vorher stand hier eine blonde Platte,
    // die den halben Rücken verdeckte.
    ? smoothClosed([
      [cx - 30, headY - 20 + bob], [cx + 30, headY - 20 + bob],
      [cx + 33, headY + 6 + bob], [cx + 28, headY + 24 + bob],
      [cx + 20, headY + 20 + bob], [cx + 10, headY + 27 + bob],
      [cx, headY + 22 + bob],
      [cx - 10, headY + 27 + bob], [cx - 20, headY + 20 + bob],
      [cx - 28, headY + 24 + bob], [cx - 33, headY + 6 + bob],
    ], 6)
    : smoothClosed([
      [cx - 30, headY - 20 + bob], [cx + 30, headY - 20 + bob],
      [cx + 35 - hairSide, headY + 8 + bob], [cx + 31 - hairSide, headY + 33 + bob],
      [cx + 20 - hairSide, headY + 34 + bob], [cx + 21, headY + 12 + bob],
      [cx, headY + 20 + bob],
      [cx - 21, headY + 12 + bob], [cx - 20 + hairSide, headY + 34 + bob],
      [cx - 31 + hairSide, headY + 33 + bob], [cx - 35 + hairSide, headY + 8 + bob],
    ], 6);

  const brim = smoothClosed(blob(cx, headY - 23 + bob, 43, 11, seed + 5, 0.07, 18), 6);
  const crown = smoothClosed(blob(cx, headY - 34 + bob, 21, 14, seed + 6, 0.07, 14), 5);
  // Rucksack auf dem unteren Rücken, unter den Haarspitzen. Eigene Farbe:
  // im selben Braun wie der Hut sah er aus wie ein zweiter Hut.
  const pack = smoothClosed(blob(cx, baseY - 54 + bob, 15, 14, seed + 7, 0.07, 16), 5);
  // Halstuch: kleines Dreieck unterhalb des Kinns, kein Lätzchen vor dem Mund
  const scarf = smoothClosed([
    [cx - 10, headY + 31 + bob], [cx + 10, headY + 31 + bob],
    [cx + 5, headY + 38 + bob], [cx, headY + 42 + bob], [cx - 5, headY + 38 + bob],
  ], 5);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.1,
    outline: 1.9,
    shadow: function (g) { groundShadow(g, cx, baseY - 2, 30, 9, seed + 8, 0.17); },
    wash: function (g) {
      // Haar hinter allem, damit Kopf und Arm davor liegen
      wash(g, hairBack, hair, { seed: seed + 31, scale: 1.03 });
      wash(g, offsetShape(hairBack, 8, 7, 0.62), hairShade, { seed: seed + 38, alpha: 0.5 });

      wash(g, legL, SELI.tights, { seed: seed + 10 });
      wash(g, legR, SELI.tights, { seed: seed + 11 });
      wash(g, bootL, SELI.boot, { seed: seed + 64 });
      wash(g, bootR, SELI.boot, { seed: seed + 65 });

      // Oberteil zuerst, Rock darüber – sonst blutet das Blau ins Rot
      wash(g, body, SELI.top, { seed: seed + 12, scale: 1.03 });
      wash(g, offsetShape(body, 8, 5, 0.6), SELI.topShade, { seed: seed + 13, alpha: 0.6 });
      wash(g, armL, SELI.top, { seed: seed + 14 });
      wash(g, armR, SELI.top, { seed: seed + 15 });
      wash(g, skirt, SELI.skirt, { seed: seed + 20, scale: 1.02 });
      wash(g, offsetShape(skirt, 8, 4, 0.66), SELI.skirtShade, { seed: seed + 21, alpha: 0.6 });

      if (back) {
        wash(g, pack, SELI.pack, { seed: seed + 16, scale: 1.03 });
        wash(g, offsetShape(pack, 6, 5, 0.6), SELI.packShade, { seed: seed + 17, alpha: 0.6 });
      } else {
        wash(g, scarf, SELI.scarf, { seed: seed + 18 });
        wash(g, head, ink.skin, { seed: seed + 22, scale: 1.04 });
        wash(g, offsetShape(head, 10, 8, 0.54), ink.skinShade, { seed: seed + 23, alpha: 0.4 });
      }

      // Pony bzw. Hinterkopf
      const fringe = back
        ? smoothClosed(blob(cx, headY + 1 + bob, 29, 27, seed + 35, 0.06, 18), 6)
        : smoothClosed([
          [cx - 29, headY - 4 + bob], [cx - 21, headY - 17 + bob], [cx, headY - 21 + bob],
          [cx + 23, headY - 15 + bob], [cx + 29, headY - 1 + bob],
          [cx + 11, headY - 9 + bob], [cx - 8, headY - 5 + bob], [cx - 17, headY - 11 + bob],
        ], 6);
      wash(g, fringe, hair, { seed: seed + 36, scale: 1.02 });
      wash(g, offsetShape(fringe, -7, -6, 0.55), hairLight, { seed: seed + 37, alpha: 0.7 });

      wash(g, brim, SELI.hat, { seed: seed + 24, scale: 1.04 });
      wash(g, crown, SELI.hat, { seed: seed + 25 });
      wash(g, offsetShape(crown, 5, 4, 0.7), SELI.hatShade, { seed: seed + 26, alpha: 0.6 });
    },
    shape: function (g) {
      fill(g, hairBack);
      fill(g, legL); fill(g, legR);
      fill(g, bootL); fill(g, bootR);
      fill(g, skirt);
      fill(g, body);
      fill(g, armL); fill(g, armR);
      if (back) fill(g, pack);
      fill(g, head); fill(g, crown); fill(g, brim);
    },
    ink: function (g) {
      inkStroke(g, brim, { width: 2.3, vary: 0.35, seed: seed + 50, color: ink.line, alpha: 0.9 });
      inkLine(g, cx - 20, headY - 26 + bob, cx + 20, headY - 26 + bob,
        { width: 2.0, bend: 0.1, seed: seed + 57, color: SELI.hatShade, alpha: 0.85 });
      inkStroke(g, skirt, { width: 2.1, vary: 0.3, seed: seed + 55, color: ink.line, alpha: 0.7 });
      inkStroke(g, bootL, { width: 1.9, vary: 0.3, seed: seed + 68, color: ink.line, alpha: 0.7 });
      inkStroke(g, bootR, { width: 1.9, vary: 0.3, seed: seed + 69, color: ink.line, alpha: 0.7 });
      inkLine(g, cx, baseY - 26 + bob, cx, baseY - 13, { width: 1.5, bend: 0, seed: seed + 51, alpha: 0.45 });

      if (back) {
        inkStroke(g, pack, { width: 2.2, vary: 0.3, seed: seed + 52, color: ink.line, alpha: 0.8 });
        // Deckelnaht und die beiden Träger, die unter dem Haar verschwinden
        inkLine(g, cx - 13, baseY - 58 + bob, cx + 13, baseY - 59 + bob,
          { width: 1.6, bend: 0.14, seed: seed + 54, color: SELI.packShade, alpha: 0.8 });
        inkLine(g, cx - 11, baseY - 70 + bob, cx - 8, baseY - 60 + bob,
          { width: 2.0, bend: 0.1, seed: seed + 53, color: SELI.packShade, alpha: 0.6 });
        inkLine(g, cx + 11, baseY - 70 + bob, cx + 8, baseY - 60 + bob,
          { width: 2.0, bend: -0.1, seed: seed + 58, color: SELI.packShade, alpha: 0.6 });
        // Scheitel und zwei Haarwellen von hinten
        inkLine(g, cx, headY - 16 + bob, cx, headY + 16 + bob,
          { width: 1.6, bend: 0.03, seed: seed + 59, color: hairShade, alpha: 0.55 });
        for (let i = -1; i <= 1; i += 2) {
          inkLine(g, cx + i * 14, headY - 12 + bob, cx + i * 20, headY + 18 + bob,
            { width: 1.4, bend: i * 0.08, seed: seed + 60 + i, color: hairShade, alpha: 0.5 });
        }
        return;
      }

      inkStroke(g, scarf, { width: 2.0, vary: 0.3, seed: seed + 56, color: ink.line, alpha: 0.75 });

      // Gesicht
      //
      // Das Auge in drei Lagen: dunkle Kontur, blaue Iris, schwarze Pupille.
      // Nur eine blaue Fläche wäre auf zehn Pixeln kein Auge mehr, sondern ein
      // Fleck – der dunkle Rand hält die Form, die Pupille den Blick.
      const ex = side ? 9 : 0;
      const augeL = { x: cx - 11 + ex, y: headY + 5 + bob, rx: 3.6, ry: 4.8 };
      const augeR = side
        ? { x: cx + 19, y: headY + 5 + bob, rx: 3.2, ry: 4.4 }
        : { x: cx + 11, y: headY + 5 + bob, rx: 3.6, ry: 4.8 };
      const augen = side ? [augeL, augeR] : [augeL, augeR];

      g.fillStyle = ink.line;
      for (let i = 0; i < augen.length; i++) {
        const a = augen[i];
        fill(g, smoothClosed(blob(a.x, a.y, a.rx, a.ry, seed + 40 + i, 0.08, 10), 4));
      }
      // Iris: etwas kleiner als die Kontur, minimal nach unten gesetzt –
      // dadurch bleibt oben ein dunkler Lidschatten stehen.
      g.fillStyle = SELI.eye;
      for (let i = 0; i < augen.length; i++) {
        const a = augen[i];
        g.beginPath();
        g.ellipse(a.x, a.y + 0.5, a.rx * 0.74, a.ry * 0.72, 0, 0, 6.2832);
        g.fill();
      }
      g.fillStyle = SELI.eyeDeep;
      for (let i = 0; i < augen.length; i++) {
        const a = augen[i];
        g.beginPath();
        g.ellipse(a.x, a.y + 0.9, a.rx * 0.4, a.ry * 0.42, 0, 0, 6.2832);
        g.fill();
      }
      // Lichtpunkt oben links im Auge – erst damit schaut sie wirklich
      g.fillStyle = '#fffdf6';
      g.beginPath();
      g.arc(cx - 12.2 + ex, headY + 3.4 + bob, 1.2, 0, 6.2832);
      g.arc((side ? cx + 17.8 : cx + 9.8), headY + 3.4 + bob, 1.15, 0, 6.2832);
      g.fill();
      g.fillStyle = ink.line;
      // Wimpern – machen das Gesicht auch winzig noch lesbar
      inkLine(g, cx - 16 + ex, headY - 1 + bob, cx - 8 + ex, headY + 1 + bob,
        { width: 1.5, bend: -0.25, seed: seed + 45, alpha: 0.8 });
      if (!side) {
        inkLine(g, cx + 8, headY + 1 + bob, cx + 16, headY - 1 + bob,
          { width: 1.5, bend: -0.25, seed: seed + 46, alpha: 0.8 });
      }
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

  // Kopfbedeckungen gehören in die Silhouette, sonst liegen sie als Farbfleck
  // ohne Kontur neben dem Kopf. Das Halstuch dagegen wird beschnitten: es
  // liegt um den Hals, es steht nicht ab.
  const worn = [];
  if (look.hat === 'cap') {
    worn.push(smoothClosed(blob(cx, headY - 32 + bob, 40, 15, seed + 23, 0.08, 16), 5));
    worn.push(smoothClosed(blob(cx, headY - 24 + bob, 48, 8, seed + 25, 0.08, 16), 5));
  } else if (look.hat === 'bow') {
    worn.push(smoothClosed([[cx, headY - 36 + bob], [cx - 26, headY - 48 + bob], [cx - 26, headY - 26 + bob]], 5));
    worn.push(smoothClosed([[cx, headY - 36 + bob], [cx + 26, headY - 48 + bob], [cx + 26, headY - 26 + bob]], 5));
  }
  // Sitzt am Hals unter der Schnauze, nicht quer darüber, und hängt in der
  // Mitte durch – ein gerader Streifen sah aus wie ein Balken.
  const scarf = look.hat === 'scarf' ? smoothClosed([
    [cx - 42, baseY - 78 + bob], [cx - 20, baseY - 70 + bob], [cx, baseY - 65 + bob],
    [cx + 20, baseY - 70 + bob], [cx + 42, baseY - 78 + bob],
    [cx + 40, baseY - 58 + bob], [cx, baseY - 44 + bob], [cx - 40, baseY - 58 + bob],
  ], 6) : null;
  const flowers = look.hat === 'flowers' ? [
    [cx - 26, headY - 34 + bob, 11, ink.petalPink, seed + 20],
    [cx, headY - 42 + bob, 11, ink.petalYellow, seed + 21],
    [cx + 26, headY - 34 + bob, 11, ink.petalViolet, seed + 22],
  ] : null;

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.5,
    outline: 2.0,
    wash: function (g) {
      // Geisterschimmer: eine helle Aura hinter der Figur. Sie macht aus dem
      // Fellknäuel etwas, das nicht ganz da ist.
      g.save();
      g.globalAlpha = 0.3;
      g.fillStyle = '#ffffff';
      fill(g, smoothClosed(blob(cx, baseY - 74 + bob, 58, 62, seed + 60, 0.09, 18), 6));
      g.restore();

      wash(g, tail, fur, { seed: seed + 10, alpha: 0.68 });
      wash(g, body, fur, { seed: seed + 11, scale: 1.05 });
      wash(g, offsetShape(body, -LIGHT.x * 22, -LIGHT.y * 13, 0.62), furShade,
        { seed: seed + 12, alpha: 0.6 });
      for (let i = 0; i < ears.length; i++) wash(g, ears[i], furShade, { seed: seed + 13 + i });
      wash(g, head, fur, { seed: seed + 15, scale: 1.05 });
      wash(g, offsetShape(head, -LIGHT.x * 22, -LIGHT.y * 14, 0.6), furShade,
        { seed: seed + 16, alpha: 0.48 });
      // Lichtseite oben links – dieselbe Sonne wie überall sonst
      wash(g, offsetShape(head, LIGHT.x * 17, LIGHT.y * 15, 0.5), '#fffdf6',
        { seed: seed + 18, alpha: 0.4 });
      wash(g, offsetShape(body, LIGHT.x * 18, LIGHT.y * 12, 0.45), '#fffdf6',
        { seed: seed + 19, alpha: 0.3 });
      wash(g, muzzle, '#faf4e6', { seed: seed + 17 });

      if (scarf) {
        clipTo(g, [body, head]);
        wash(g, scarf, accent, { seed: seed + 18 });
        g.restore();
      }
      for (let i = 0; i < worn.length; i++) {
        wash(g, worn[i], accent, { seed: seed + 24 + i });
      }
      if (flowers) {
        for (let i = 0; i < flowers.length; i++) {
          const f = flowers[i];
          dot(g, null, f[0], f[1], f[2], f[3], f[4]);
        }
      }
    },
    shape: function (g) {
      fill(g, tail);
      for (let i = 0; i < ears.length; i++) fill(g, ears[i]);
      fill(g, body);
      fill(g, head);
      for (let i = 0; i < worn.length; i++) fill(g, worn[i]);
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
        // Lichtpunkt im Auge, oben links wie überall. Ohne ihn bleibt der
        // Blick ein schwarzer Fleck; mit ihm schaut die Figur.
        g.fillStyle = '#fffdf6';
        g.beginPath();
        g.arc(cx - 17.6, headY - 5 + bob, 1.5, 0, 6.2832);
        g.arc(cx + 14.4, headY - 5 + bob, 1.5, 0, 6.2832);
        g.fill();
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
      if (flowers) {
        for (let i = 0; i < flowers.length; i++) {
          const f = flowers[i];
          dot(null, g, f[0], f[1], f[2], f[3], f[4]);
        }
      }
      if (scarf) {
        // Obere Kante und ein Knoten – ohne sie ist das Halstuch ein Farbfleck
        inkLine(g, cx - 34, baseY - 76 + bob, cx, baseY - 64 + bob, { width: 1.7, bend: -0.2, seed: seed + 62, alpha: 0.6 });
        inkLine(g, cx + 34, baseY - 76 + bob, cx, baseY - 64 + bob, { width: 1.7, bend: 0.2, seed: seed + 63, alpha: 0.6 });
        inkLine(g, cx - 3, baseY - 62 + bob, cx - 8, baseY - 47 + bob, { width: 1.5, bend: 0.22, seed: seed + 64, alpha: 0.45 });
        inkLine(g, cx + 4, baseY - 62 + bob, cx + 7, baseY - 47 + bob, { width: 1.5, bend: -0.22, seed: seed + 65, alpha: 0.4 });
      }
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
    blur: 1.8,
    outline: 2.0,
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
  return made({ color: res.color, line: res.color, margin: res.margin }, w, h, cx, baseY);
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

  // Schweif: eine Sichel, die aus der Hüfte nach hinten oben schwingt und zur
  // Spitze schmaler wird. Eine einzelne hohe Blase sah aus wie eine Platte.
  const tail = smoothClosed([
    [cx - 18, baseY - 58 + bob], [cx - 32, baseY - 70 + bob], [cx - 43, baseY - 83 + bob],
    [cx - 52, baseY - 90 + bob],
    [cx - 60, baseY - 81 + bob], [cx - 58, baseY - 66 + bob], [cx - 50, baseY - 51 + bob],
    [cx - 38, baseY - 37 + bob], [cx - 24, baseY - 30 + bob], [cx - 15, baseY - 40 + bob],
  ], 7);
  const tailTip = smoothClosed(blob(cx - 51, baseY - 80 + bob, 12, 13, seed + 1, 0.12, 14), 5);
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
    blur: 1.5,
    outline: 1.9,
    shadow: function (g) { groundShadow(g, cx, baseY - 2, 36, 11, seed + 5, 0.16); },
    wash: function (g) {
      wash(g, tail, fur, { seed: seed + 10, scale: 1.03 });
      clipTo(g, [tail]);
      wash(g, offsetShape(tail, -6, 6, 0.86), furDark, { seed: seed + 9, alpha: 0.45 });
      g.restore();
      wash(g, tailTip, light, { seed: seed + 11 });
      wash(g, legL, furDark, { seed: seed + 12 });
      wash(g, legR, furDark, { seed: seed + 13 });
      wash(g, body, fur, { seed: seed + 14, scale: 1.05 });
      wash(g, offsetShape(body, 0, 12, 0.72), light, { seed: seed + 15, alpha: 0.8 });
      // Weste auf den Körper beschnitten – die Lasur liegt versetzt und stand
      // sonst seitlich über das Fell hinaus
      clipTo(g, [body]);
      wash(g, vest, ink.cloth, { seed: seed + 16 });
      g.restore();
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
      // Grenze zwischen Schweif und weisser Spitze, dazu ein paar Fellstriche.
      // Beschnitten, damit kein Strich neben dem Schweif in der Luft endet.
      clipTo(g, [tail]);
      inkLine(g, cx - 60, baseY - 72 + bob, cx - 42, baseY - 82 + bob,
        { width: 1.6, bend: -0.3, seed: seed + 25, color: furDark, alpha: 0.55 });
      for (let i = 0; i < 3; i++) {
        inkLine(g, cx - 24 - i * 9, baseY - 40 - i * 12 + bob, cx - 36 - i * 8, baseY - 48 - i * 12 + bob,
          { width: 1.4, bend: 0.2, seed: seed + 26 + i, color: furDark, alpha: 0.4 });
      }
      g.restore();
      inkStroke(g, vest, { width: 2.2, vary: 0.3, seed: seed + 30, color: ink.line, alpha: 0.85 });
      inkStroke(g, snout, { width: 2.0, vary: 0.3, seed: seed + 31, color: ink.line, alpha: 0.6 });
      inkStroke(g, earL, { width: 2.0, vary: 0.3, seed: seed + 32, color: ink.line, alpha: 0.5 });
      inkStroke(g, earR, { width: 2.0, vary: 0.3, seed: seed + 33, color: ink.line, alpha: 0.5 });
      g.fillStyle = ink.line;
      fill(g, smoothClosed(blob(cx - 12, headY - 2 + bob, 4, 5, seed + 40, 0.08, 10), 4));
      fill(g, smoothClosed(blob(cx + 12, headY - 2 + bob, 4, 5, seed + 41, 0.08, 10), 4));
      g.fillStyle = '#fffdf6';
      g.beginPath();
      g.arc(cx - 13.2, headY - 3.6 + bob, 1.3, 0, 6.2832);
      g.arc(cx + 10.8, headY - 3.6 + bob, 1.3, 0, 6.2832);
      g.fill();
      g.fillStyle = ink.line;
      fill(g, smoothClosed(blob(cx, headY + 12 + bob, 5.4, 4, seed + 42, 0.08, 10), 4));
      inkLine(g, cx, headY + 16 + bob, cx - 8, headY + 22 + bob, { width: 1.5, bend: 0.2, seed: seed + 43 });
      inkLine(g, cx, headY + 16 + bob, cx + 8, headY + 22 + bob, { width: 1.5, bend: -0.2, seed: seed + 44 });
    },
  });
  return made(res, w, h, cx, baseY);
}
