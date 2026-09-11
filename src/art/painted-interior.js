/**
 * Das Hausinnere – Boden, Wand und Tür.
 *
 * Ein Raum ist hier EIN Bild, kein Kachelboden. Das ist die ganze Idee hinter
 * dem Zimmer: Man sieht es immer vollständig, es scrollt nicht, und deshalb
 * darf es auch in einem Stück gemalt sein – mit denselben fünf Durchgängen
 * wie jeder Baum und jede Bank.
 *
 * Vier Räume, einer je Ausbaustufe. Die Zeltecke ist Stoff und gestampfte
 * Erde; ab der Hütte sind es Dielen und eine Bretterwand, und mit jeder Stufe
 * kommt Licht dazu: ein Fenster, dann zwei, dann die offene Verandatür.
 */
import {
  offsetShape, inkStroke, inkLine, wash, paintObject,
} from './brush.js';
import { INK as ink, fill, made, poly } from './painted.js';

/**
 * Holztöne der Dielen und der Wand – wärmer als draußen, es ist ja drinnen.
 *
 * Wand und Boden müssen sich deutlich trennen, sonst ist der Raum ein Karton.
 * Die erste Fassung lag nur zwei Stufen auseinander und sah genau so aus:
 * eine beige Fläche mit einem Strich in der Mitte.
 */
const HOLZ = {
  boden: '#c9a273',
  bodenTief: '#a17b52',
  wand: '#ece0c8',
  wandTief: '#d3c0a0',
  leiste: '#8f6d49',
  stoff: '#e8dfc8',
  stoffTief: '#c9bb9c',
  erde: '#bfa27c',
  fenster: '#d8e8ee',
  fensterLicht: '#f3f8f6',
  fensterTief: '#a9c4cf',
  schwelle: '#a9855e',
  lichtFleck: '#f6ecd2',
};

/**
 * Ein Zimmer malen.
 *
 * @param {object} opts  w, h (Boden), wand (Wandhöhe), stufe, tuerX, tuerW
 */
export function paintRoom(opts) {
  const o = opts || {};
  const rw = o.w || 620;
  const rh = o.h || 420;
  const wand = o.wand || 120;
  const stufe = o.stufe || 2;
  const tuerW = o.tuerW || 104;
  const tuerX = o.tuerX != null ? o.tuerX : rw / 2 - tuerW / 2;
  const seed = o.seed || 1900 + stufe * 7;

  const w = rw;
  const h = wand + rh;
  const zelt = stufe <= 1;

  // Die Wand steht oben, der Boden darunter. Beide gehen bis an den Rand:
  // Ein Zimmer mit Luft ringsum sähe aus wie ein Möbelstück.
  const wandFlaeche = poly([[0, 0], [w, 0], [w, wand], [0, wand]], 2);
  const bodenFlaeche = poly([[0, wand], [w, wand], [w, h], [0, h]], 2);

  // Die Türöffnung: unten in der Mitte, als hellerer Streifen mit Schwelle.
  const tuer = poly([
    [tuerX, h - 26], [tuerX + tuerW, h - 26], [tuerX + tuerW, h], [tuerX, h],
  ], 2);

  const fenster = [];
  if (!zelt) {
    const n = stufe >= 4 ? 2 : 1;
    const fw = 92;
    const fh = Math.min(66, wand - 36);
    for (let i = 0; i < n; i++) {
      // Gleichmäßig verteilt: bei einem in der Mitte, bei zweien gedrittelt.
      const cx = w * ((i + 1) / (n + 1));
      const y0 = Math.round((wand - fh) / 2);
      fenster.push(poly([
        [cx - fw / 2, y0], [cx + fw / 2, y0],
        [cx + fw / 2, y0 + fh], [cx - fw / 2, y0 + fh],
      ], 2));
    }
  }

  const res = paintObject(w, h, {
    seed: seed,
    blur: 2.2,
    outline: 1.5,
    // Kein Bodenschatten: Der Raum IST der Boden.
    shadow: null,
    wash: function (g) {
      wash(g, wandFlaeche, zelt ? HOLZ.stoff : HOLZ.wand, { seed: seed + 1, scale: 1.05 });
      // Die untere Wandhälfte etwas tiefer: Licht kommt von oben, auch drinnen.
      wash(g, offsetShape(wandFlaeche, 0, wand * 0.42, 0.9),
        zelt ? HOLZ.stoffTief : HOLZ.wandTief, { seed: seed + 2, alpha: 0.5 });
      wash(g, bodenFlaeche, zelt ? HOLZ.erde : HOLZ.boden, { seed: seed + 3, scale: 1.04 });
      // Ein dunklerer Saum am Fuß der Wand – sonst schwebt der Boden.
      wash(g, poly([[0, wand], [w, wand], [w, wand + 34], [0, wand + 34]], 2),
        HOLZ.bodenTief, { seed: seed + 4, alpha: 0.4 });
      for (let i = 0; i < fenster.length; i++) {
        const f = fenster[i];
        // Zwei Lagen: der Himmel dahinter, und darunter der hellere Rand,
        // wo das Licht auf die Scheibe fällt.
        wash(g, f, HOLZ.fenster, { seed: seed + 10 + i, scale: 1.03 });
        wash(g, offsetShape(f, 0, 18, 0.62), HOLZ.fensterTief,
          { seed: seed + 20 + i, alpha: 0.5 });
        wash(g, offsetShape(f, 0, -10, 0.5), HOLZ.fensterLicht,
          { seed: seed + 25 + i, alpha: 0.55 });
        // Und der Lichtfleck, den es auf die Dielen wirft. Er ist der Grund,
        // warum ein Zimmer nach Nachmittag aussieht und nicht nach Karton.
        let cx = 0;
        for (let k = 0; k < f.length; k++) cx += f[k][0];
        cx /= f.length;
        wash(g, poly([
          [cx - 66, wand + 8], [cx + 66, wand + 8],
          [cx + 108, wand + rh * 0.52], [cx - 108, wand + rh * 0.52],
        ], 2), HOLZ.lichtFleck, { seed: seed + 27 + i, alpha: 0.4 });
      }
      wash(g, tuer, HOLZ.schwelle, { seed: seed + 30, alpha: 0.8 });
    },
    shape: function (g) {
      fill(g, wandFlaeche);
      fill(g, bodenFlaeche);
    },
    ink: function (g) {
      // Dielen: waagerechte Fugen, mit der Tiefe enger – das ist die ganze
      // Perspektive, die dieser Raum braucht.
      const fugen = zelt ? 4 : Math.max(5, Math.round(rh / 62));
      for (let i = 1; i < fugen; i++) {
        const t = i / fugen;
        const y = wand + rh * (t * t * 0.35 + t * 0.65);
        inkLine(g, 2, y, w - 2, y, {
          width: zelt ? 1.0 : 1.3, bend: 0.012, seed: seed + 40 + i,
          color: ink.lineSoft, alpha: zelt ? 0.28 : 0.42,
        });
      }
      // Stöße zwischen den Brettern, versetzt. Beim Zelt entfallen sie – ein
      // Zeltboden hat keine Dielen.
      if (!zelt) {
        for (let i = 0; i < 5; i++) {
          const x = w * ((i + 0.5) / 5) + ((i % 2) ? 26 : -26);
          const y0 = wand + rh * (0.18 + (i % 3) * 0.22);
          inkLine(g, x, y0, x, y0 + rh * 0.2, {
            width: 1.0, bend: 0.02, seed: seed + 60 + i,
            color: ink.lineSoft, alpha: 0.3,
          });
        }
      }
      // Die Wandbretter senkrecht – oder beim Zelt die Nähte der Bahnen.
      const bretter = zelt ? 5 : Math.max(6, Math.round(w / 96));
      for (let i = 1; i < bretter; i++) {
        const x = (w / bretter) * i;
        inkLine(g, x, 3, x, wand - 3, {
          width: zelt ? 1.0 : 1.2, bend: zelt ? 0.06 : 0.015, seed: seed + 80 + i,
          color: ink.lineSoft, alpha: zelt ? 0.3 : 0.38,
        });
      }
      // Die Leiste, an der Wand und Boden sich treffen.
      inkLine(g, 0, wand, w, wand,
        { width: 2.2, bend: 0.006, seed: seed + 100, color: HOLZ.leiste, alpha: 0.9 });
      // Fensterrahmen und Kreuz.
      for (let i = 0; i < fenster.length; i++) {
        inkStroke(g, fenster[i], { width: 1.8, seed: seed + 110 + i });
        const p = fenster[i];
        let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let maxY = -Infinity;
        for (let k = 0; k < p.length; k++) {
          minX = Math.min(minX, p[k][0]); maxX = Math.max(maxX, p[k][0]);
          minY = Math.min(minY, p[k][1]); maxY = Math.max(maxY, p[k][1]);
        }
        inkLine(g, (minX + maxX) / 2, minY, (minX + maxX) / 2, maxY,
          { width: 1.4, bend: 0.01, seed: seed + 120 + i, color: ink.lineSoft, alpha: 0.7 });
        inkLine(g, minX, (minY + maxY) / 2, maxX, (minY + maxY) / 2,
          { width: 1.4, bend: 0.01, seed: seed + 130 + i, color: ink.lineSoft, alpha: 0.7 });
      }
      // Die Tür: Schwelle quer, Zarge senkrecht. Man soll auf einen Blick
      // sehen, wo es hinausgeht – es ist der einzige Ausgang.
      inkStroke(g, tuer, { width: 1.8, seed: seed + 140 });
      inkLine(g, tuerX, h - 26, tuerX, h,
        { width: 2.0, bend: 0.01, seed: seed + 141, color: ink.line, alpha: 0.85 });
      inkLine(g, tuerX + tuerW, h - 26, tuerX + tuerW, h,
        { width: 2.0, bend: 0.01, seed: seed + 142, color: ink.line, alpha: 0.85 });
      // Der Rahmen des ganzen Raums.
      inkStroke(g, wandFlaeche, { width: 1.6, seed: seed + 150 });
      inkStroke(g, bodenFlaeche, { width: 1.6, seed: seed + 151 });
    },
  });
  // Anker oben links: Der Raum wird als Fläche gesetzt, nicht als Möbelstück
  // auf einen Fußpunkt.
  return made(res, w, h, 0, 0);
}

/** Bettfarben: Holzgestell, helle Decke, ein warmer Streifen. */
const BETT = {
  holz: '#b98c5c',
  holzTief: '#8f6942',
  laken: '#f3ead6',
  decke: '#c9a0a8',
  deckeTief: '#a87d87',
  kissen: '#fbf5e6',
};

/**
 * Das Bett – fest eingebaut, in jedem Zimmer dasselbe.
 *
 * Von schräg oben gesehen wie alles hier: Kopfende hinten, Fußende vorn.
 * Es ist der Grund, abends hineinzugehen, und deshalb bewusst so gemalt,
 * dass man es aus zwanzig Metern erkennt – helle Decke gegen dunkles Holz.
 */
export function paintBed(opts) {
  const o = opts || {};
  const w = 150;
  const h = 190;
  const seed = o.seed || 1971;
  const cx = w / 2;

  const gestell = poly([
    [cx - 62, 22], [cx + 62, 22], [cx + 66, h - 16], [cx - 66, h - 16],
  ], 3);
  const kopf = poly([
    [cx - 60, 8], [cx + 60, 8], [cx + 60, 40], [cx - 60, 40],
  ], 3);
  const laken = poly([
    [cx - 52, 36], [cx + 52, 36], [cx + 54, h - 30], [cx - 54, h - 30],
  ], 3);
  const decke = poly([
    [cx - 54, h - 108], [cx + 54, h - 108], [cx + 56, h - 28], [cx - 56, h - 28],
  ], 3);
  const kissen = poly([
    [cx - 40, 42], [cx + 40, 42], [cx + 40, 78], [cx - 40, 78],
  ], 3);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.6,
    outline: 1.7,
    wash: function (g) {
      wash(g, gestell, BETT.holz, { seed: seed + 1, scale: 1.03 });
      wash(g, offsetShape(gestell, 0, 26, 0.8), BETT.holzTief, { seed: seed + 2, alpha: 0.45 });
      wash(g, kopf, BETT.holzTief, { seed: seed + 3, scale: 1.02 });
      wash(g, laken, BETT.laken, { seed: seed + 4, scale: 1.02 });
      wash(g, decke, BETT.decke, { seed: seed + 5, scale: 1.03 });
      wash(g, offsetShape(decke, 0, 22, 0.7), BETT.deckeTief, { seed: seed + 6, alpha: 0.5 });
      wash(g, kissen, BETT.kissen, { seed: seed + 7, scale: 1.02 });
    },
    shape: function (g) {
      fill(g, kopf);
      fill(g, gestell);
    },
    ink: function (g) {
      inkStroke(g, gestell, { width: 1.9, seed: seed + 10 });
      inkStroke(g, kopf, { width: 1.7, seed: seed + 11 });
      inkStroke(g, laken, { width: 1.2, seed: seed + 12 });
      inkStroke(g, decke, { width: 1.5, seed: seed + 13 });
      inkStroke(g, kissen, { width: 1.3, seed: seed + 14 });
      // Falten in der Decke – ohne sie ist sie ein rosa Rechteck.
      for (let i = 1; i < 4; i++) {
        const x = cx - 54 + (108 / 4) * i;
        inkLine(g, x, h - 104, x, h - 34,
          { width: 1.1, bend: 0.05, seed: seed + 20 + i, color: ink.lineSoft, alpha: 0.45 });
      }
      // Die Bretter im Kopfteil.
      for (let i = 1; i < 4; i++) {
        const x = cx - 60 + (120 / 4) * i;
        inkLine(g, x, 11, x, 37,
          { width: 1.1, bend: 0.02, seed: seed + 30 + i, color: ink.lineSoft, alpha: 0.5 });
      }
    },
  });
  // Fußpunkt unten: Das Bett steht auf dem Boden wie jedes Möbelstück, und
  // die Tiefensortierung im Zimmer rechnet mit dem Fuß.
  return made(res, w, h, cx, h - 10);
}
