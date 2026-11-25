/**
 * Die Flora der trockenen Zonen – Wüste und Steppe.
 *
 * **Warum eine eigene Datei.** `painted.js` ist die gemäßigte Zone: Eiche,
 * Birke, Farn, Pilz. Die Trockenpflanzen teilen mit ihnen die Werkzeuge
 * (Klecks, Lasur, Tuschestrich) und sonst nichts – keine Farbe, keine
 * Silhouette, keine Jahreszeit. Sie hier zu versammeln hält beide Dateien
 * lesbar und macht sichtbar, dass eine Zone eine Liste von Pflanzen IST.
 *
 * **Was eine Trockenpflanze ausmacht, und zwar zeichnerisch.** Drei Dinge,
 * und alle drei stecken in jedem Maler hier drin:
 *
 *   1. **Blaugrün statt Grasgrün.** Wachsschichten und Behaarung, die vor
 *      Verdunstung schützen, streuen blaues Licht. Man erkennt eine
 *      Trockenpflanze daran, bevor man ihre Form gesehen hat.
 *   2. **Wenig Blattfläche, viel Kante.** Ein Blatt ist eine Verdunstungs-
 *      fläche; wo Wasser knapp ist, wird daraus eine Rippe, ein Dorn oder
 *      ein Stiel. Also schmale Silhouetten und harte Ecken statt der
 *      runden Lappen, aus denen die Laubbäume bestehen.
 *   3. **Harter Schatten.** Keine Wolke dämpft ihn. Die Bodenschatten sind
 *      hier kürzer und kräftiger als in der gemäßigten Zone.
 */
import {
  blob, smoothClosed, offsetShape, pathFrom,
  inkStroke, inkLine, wash, paintObject, groundShadow, LIGHT,
} from './brush.js';
import { INK as ink, fill, made, slab, dot } from './painted.js';
import { makeRng } from '../core/rng.js';

/**
 * Säulenkaktus – das Wahrzeichen der Wüste.
 *
 * Er ist bewusst der größte Gegenstand der Zone und steht dort an der
 * Stelle, an der im Wald ein Baum steht: Wer ihn sieht, weiß ohne Karte,
 * wo er ist.
 *
 * **Die Rippen sind nicht Schmuck, sie sind die Form.** Ein Kaktus ohne
 * senkrechte Rippen ist ein grüner Pfosten. Sie laufen über die ganze
 * Höhe, biegen sich mit dem Körper und enden oben in der Rundung – und
 * weil sie die einzige Innenzeichnung sind, tragen sie die ganze
 * Plastizität.
 */
export function paintKaktus(opts) {
  const o = opts || {};
  const seed = o.seed || 3101;
  const rng = makeRng(seed >>> 0);
  const w = 112;
  const h = 196;
  const cx = w / 2;
  const baseY = h - 10;

  // Der Stamm: unten breiter als oben, mit leicht ungleichen Seiten.
  const stammB = 19 + rng() * 4;
  const stamm = smoothClosed([
    [cx - stammB, baseY], [cx - stammB - 1, baseY - 60],
    [cx - stammB + 2, baseY - 120], [cx - stammB + 5, baseY - 150],
    [cx, baseY - 162],
    [cx + stammB - 4, baseY - 150], [cx + stammB - 2, baseY - 118],
    [cx + stammB + 1, baseY - 58], [cx + stammB, baseY],
  ], 5);

  /**
   * Die Arme. Zwei Stück, auf verschiedener Höhe und verschieden lang.
   *
   * Beim ersten Entwurf saßen sie gegenüber auf gleicher Höhe, und das
   * Ergebnis war ein Kandelaber – symmetrisch, und damit gebaut statt
   * gewachsen. Ein echter Saguaro treibt seine Arme Jahrzehnte
   * auseinander.
   */
  const arme = [];
  const seiten = rng() < 0.5 ? [-1, 1] : [1, -1];
  for (let i = 0; i < 2; i++) {
    const s = seiten[i];
    const ansatz = baseY - (58 + i * 38 + rng() * 16);
    const laenge = 34 + rng() * 20;
    const hoch = 40 + rng() * 26;
    const d = 11 + rng() * 3;
    // Der Arm geht erst waagerecht heraus und knickt dann nach oben –
    // ein Bogen, kein Winkel, sonst sieht er angeklebt aus.
    arme.push(smoothClosed([
      [cx + s * (stammB - 4), ansatz + d],
      [cx + s * (stammB + laenge * 0.6), ansatz + d + 4],
      [cx + s * (stammB + laenge), ansatz + d - 6],
      [cx + s * (stammB + laenge), ansatz - hoch],
      [cx + s * (stammB + laenge - d * 2), ansatz - hoch - 2],
      [cx + s * (stammB + laenge - d * 2), ansatz - 8],
      [cx + s * (stammB - 4), ansatz - d],
    ], 5));
  }

  const teile = [stamm].concat(arme);

  /** Wo die Rippen laufen: x-Anteile über die Stammbreite. */
  const rippen = [-0.62, -0.26, 0.1, 0.46, 0.78];

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.3,
    outline: 1.9,
    shadow: function (g) {
      // Kurz und kräftig: In der Wüste steht die Sonne hoch und es gibt
      // nichts, was den Schatten weich macht.
      groundShadow(g, cx + 5, baseY - 2, 30, 9, seed + 1, 0.24);
    },
    wash: function (g) {
      for (let i = 0; i < teile.length; i++) {
        wash(g, teile[i], o.fleisch || ink.kaktus, { seed: seed + 10 + i, scale: 1.04 });
        wash(g, offsetShape(teile[i], -LIGHT.x * 11, -LIGHT.y * 9, 0.72),
          ink.kaktusDunkel, { seed: seed + 20 + i, alpha: 0.6 });
        wash(g, offsetShape(teile[i], LIGHT.x * 12, LIGHT.y * 8, 0.42),
          ink.kaktusLicht, { seed: seed + 30 + i, alpha: 0.7 });
      }
      // Blüten auf der Krone – nur manchmal, und dann leuchtend.
      if (o.bluete) {
        for (let i = 0; i < 3; i++) {
          dot(g, null, cx - 14 + i * 14, baseY - 160 + (i === 1 ? -5 : 2),
            6.5, ink.bluete, seed + 60 + i);
        }
      }
    },
    shape: function (g) { for (let i = 0; i < teile.length; i++) fill(g, teile[i]); },
    ink: function (g) {
      // Die Rippen des Stamms. Sie enden oben vor der Rundung, sonst
      // laufen sie über die Kuppe hinaus und der Kaktus wird ein Rohr.
      for (let i = 0; i < rippen.length; i++) {
        const x = cx + rippen[i] * stammB;
        // Zum Rand hin blasser: In der Mitte wölbt sich der Körper zum
        // Betrachter, dort sieht man die Rippe am deutlichsten.
        const mitte = 1 - Math.abs(rippen[i]);
        inkLine(g, x, baseY - 6, x + rippen[i] * 3, baseY - 142, {
          width: 1.5 + mitte * 0.7, bend: 0.012 * rippen[i],
          seed: seed + 70 + i, alpha: 0.3 + mitte * 0.3,
        });
      }
      // Je eine Rippe auf jedem Arm, dem Bogen folgend.
      for (let i = 0; i < arme.length; i++) {
        inkStroke(g, offsetShape(arme[i], 0, 0, 0.55), {
          closed: true, width: 1.4, vary: 0.3,
          seed: seed + 80 + i, alpha: 0.26, color: ink.line,
        });
      }
      // Dornenbüschel auf den Rippen: drei kurze Striche sternförmig.
      const r2 = makeRng(seed + 500);
      for (let k = 0; k < 16; k++) {
        const x = cx + rippen[(r2() * rippen.length) | 0] * stammB;
        const y = baseY - 14 - r2() * 130;
        for (let s = 0; s < 3; s++) {
          const a = -0.7 + s * 0.7 + (r2() - 0.5) * 0.3;
          inkLine(g, x, y, x + Math.cos(a) * 5, y + Math.sin(a) * 5,
            { width: 1.1, bend: 0, seed: seed + 600 + k * 3 + s, alpha: 0.5 });
        }
      }
      if (o.bluete) {
        for (let i = 0; i < 3; i++) {
          dot(null, g, cx - 14 + i * 14, baseY - 160 + (i === 1 ? -5 : 2),
            6.5, ink.bluete, seed + 60 + i);
        }
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

/**
 * Feigenkaktus – flache Scheiben, die aufeinander sitzen.
 *
 * Der Gegenentwurf zum Säulenkaktus: breit statt hoch, und damit das
 * Ding, das zwischen den Säulen den Boden füllt. Beide zusammen ergeben
 * eine Wüste; einer allein ergibt eine Wiederholung.
 */
export function paintFeigenkaktus(opts) {
  const o = opts || {};
  const seed = o.seed || 3201;
  const rng = makeRng(seed >>> 0);
  const w = 118;
  const h = 104;
  const cx = w / 2;
  const baseY = h - 8;

  /**
   * Die Scheiben wachsen auseinander hervor, jede aus dem Rand der
   * vorigen. Deshalb werden sie nacheinander gesetzt und merken sich
   * ihren Ansatzpunkt – gestreut platziert sähen sie aus wie ein Haufen
   * Teller.
   */
  const scheiben = [];
  function setze(x, y, rx, ry, k) {
    scheiben.push({
      pts: smoothClosed(blob(x, y, rx, ry, seed + k * 7, 0.11, 16), 5),
      x: x, y: y, rx: rx, ry: ry,
    });
  }
  /**
   * Eine große Grundscheibe, darauf ein Fächer.
   *
   * Beim ersten Entwurf wanderte jede Scheibe vom oberen Rand der
   * vorigen weiter nach links oder rechts. Über vier Scheiben ergab das
   * eine Treppe quer durchs Bild – gezeichnet sah es aus wie eine Raupe,
   * die den Hang hochkriecht. Ein Feigenkaktus wächst aber nicht in eine
   * Richtung davon: Er sitzt auf einem Fuß, und die oberen Scheiben
   * fächern nach BEIDEN Seiten auf.
   */
  const grundRx = 21 + rng() * 4;
  const grundRy = 24 + rng() * 5;
  setze(cx, baseY - grundRy - 4, grundRx, grundRy, 0);
  const n = 2 + ((rng() * 2) | 0);
  const seiten = [-1, 1, -0.35];
  for (let i = 0; i < n; i++) {
    const s = seiten[i];
    const rx = 14 + rng() * 5;
    const ry = 17 + rng() * 6;
    setze(cx + s * (grundRx * 0.72 + rx * 0.2),
      baseY - grundRy * 1.5 - ry * 0.7 - rng() * 8, rx, ry, i + 1);
  }

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.2,
    outline: 1.7,
    shadow: function (g) { groundShadow(g, cx + 4, baseY - 2, 28, 8, seed + 1, 0.22); },
    wash: function (g) {
      for (let i = 0; i < scheiben.length; i++) {
        const s = scheiben[i];
        wash(g, s.pts, o.fleisch || ink.kaktus, { seed: seed + 10 + i, scale: 1.05 });
        wash(g, offsetShape(s.pts, -LIGHT.x * 9, -LIGHT.y * 8, 0.66),
          ink.kaktusDunkel, { seed: seed + 20 + i, alpha: 0.55 });
        wash(g, offsetShape(s.pts, LIGHT.x * 8, LIGHT.y * 7, 0.4),
          ink.kaktusLicht, { seed: seed + 30 + i, alpha: 0.6 });
      }
      if (o.frucht) {
        for (let i = 0; i < scheiben.length; i++) {
          if (i % 2) continue;
          const s = scheiben[i];
          dot(g, null, s.x + s.rx * 0.3, s.y - s.ry * 0.8, 5, ink.bluete, seed + 70 + i);
        }
      }
    },
    shape: function (g) { for (let i = 0; i < scheiben.length; i++) fill(g, scheiben[i].pts); },
    ink: function (g) {
      // Die Scheibengrenzen nachziehen: Ohne sie verschmilzt der Stapel
      // zu einer einzigen Wolke, und genau die Teilung IST der Feigenkaktus.
      for (let i = 1; i < scheiben.length; i++) {
        inkStroke(g, offsetShape(scheiben[i].pts, 0, 0, 0.92), {
          closed: true, width: 1.6, vary: 0.35,
          seed: seed + 40 + i, alpha: 0.4, color: ink.line,
        });
      }
      // Die Areolen – die Punkte, aus denen die Dornen kommen. Beim
      // Feigenkaktus sind sie das auffälligere Zeichen als die Dornen
      // selbst: lauter kleine Tupfen in schrägen Reihen.
      const r2 = makeRng(seed + 900);
      for (let i = 0; i < scheiben.length; i++) {
        const s = scheiben[i];
        for (let k = 0; k < 7; k++) {
          const a = r2() * Math.PI * 2;
          const rr = Math.sqrt(r2()) * 0.72;
          const px = s.x + Math.cos(a) * s.rx * rr;
          const py = s.y + Math.sin(a) * s.ry * rr;
          inkLine(g, px - 2, py, px + 2, py,
            { width: 1.6, bend: 0, seed: seed + 950 + i * 7 + k, alpha: 0.45 });
        }
      }
      if (o.frucht) {
        for (let i = 0; i < scheiben.length; i++) {
          if (i % 2) continue;
          const s = scheiben[i];
          dot(null, g, s.x + s.rx * 0.3, s.y - s.ry * 0.8, 5, ink.bluete, seed + 70 + i);
        }
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

/**
 * Agave – eine Rosette steifer Blätter, jedes mit einer Spitze.
 *
 * Die dritte Silhouette der Wüste: nicht senkrecht (Säule), nicht rund
 * (Feige), sondern sternförmig. Drei Grundformen reichen, damit eine
 * Gegend nicht aus einer Pflanze besteht.
 */
export function paintAgave(opts) {
  const o = opts || {};
  const seed = o.seed || 3301;
  const rng = makeRng(seed >>> 0);
  const w = 118;
  const h = 96;
  const cx = w / 2;
  const baseY = h - 8;
  const mitteY = baseY - 10;

  const blaetter = [];
  const n = 8 + ((rng() * 3) | 0);
  for (let i = 0; i < n; i++) {
    // Gleichmäßig im Halbkreis, mit Spiel: eine Rosette ist regelmäßig,
    // aber nicht gezirkelt.
    const a = -Math.PI * 0.96 + (i / (n - 1)) * Math.PI * 0.92 + (rng() - 0.5) * 0.14;
    const laenge = 34 + rng() * 20;
    const breite = 7 + rng() * 3;
    const sx = Math.cos(a);
    const sy = Math.sin(a) * 0.72;
    const tipX = cx + sx * laenge;
    const tipY = mitteY + sy * laenge;
    // Ein Blatt ist ein Dreieck mit gebogenen Flanken – keine Keule.
    blaetter.push({
      pts: smoothClosed([
        [cx - sy * breite, mitteY + sx * breite * 0.5],
        [cx + sx * laenge * 0.5 - sy * breite, mitteY + sy * laenge * 0.5 + sx * breite],
        [tipX, tipY],
        [cx + sx * laenge * 0.5 + sy * breite, mitteY + sy * laenge * 0.5 - sx * breite],
        [cx + sy * breite, mitteY - sx * breite * 0.5],
      ], 4),
      tipX: tipX, tipY: tipY, a: a,
    });
  }
  // Von hinten nach vorne: die nach unten zeigenden Blätter zuletzt.
  blaetter.sort(function (p, q) { return p.tipY - q.tipY; });

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.1,
    outline: 1.5,
    shadow: function (g) { groundShadow(g, cx + 4, baseY - 4, 30, 8, seed + 1, 0.2); },
    wash: function (g) {
      for (let i = 0; i < blaetter.length; i++) {
        const b = blaetter[i];
        wash(g, b.pts, o.fleisch || ink.kaktus, { seed: seed + 10 + i, scale: 1.03 });
        wash(g, offsetShape(b.pts, -LIGHT.x * 6, -LIGHT.y * 5, 0.6),
          ink.kaktusDunkel, { seed: seed + 30 + i, alpha: 0.45 });
      }
    },
    shape: function (g) { for (let i = 0; i < blaetter.length; i++) fill(g, blaetter[i].pts); },
    ink: function (g) {
      for (let i = 0; i < blaetter.length; i++) {
        const b = blaetter[i];
        // Die Mittelrippe – das, was ein Agavenblatt steif aussehen lässt.
        inkLine(g, cx, mitteY, b.tipX, b.tipY,
          { width: 1.4, bend: 0.03, seed: seed + 50 + i, alpha: 0.42 });
        // Und die dunkle Spitze. Bei echten Agaven ist sie fast schwarz,
        // und sie ist das Zeichen, an dem man die Pflanze erkennt.
        inkLine(g, b.tipX - Math.cos(b.a) * 6, b.tipY - Math.sin(b.a) * 0.72 * 6,
          b.tipX, b.tipY, { width: 2.4, bend: 0, seed: seed + 70 + i, alpha: 0.85 });
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

/**
 * Dürrbusch – ein Gestrüpp aus Zweigen, fast ohne Blatt.
 *
 * Das Füllmaterial der Trockenzonen, und das einzige Ding hier, das
 * überhaupt keine Fläche hat: Es besteht nur aus Tusche. Deshalb steht es
 * auch in der Steppe, wo es die Lücken zwischen den Grasbüscheln füllt.
 */
export function paintDuerrbusch(opts) {
  const o = opts || {};
  const seed = o.seed || 3401;
  const rng = makeRng(seed >>> 0);
  const w = 96;
  const h = 84;
  const cx = w / 2;
  const baseY = h - 8;

  /**
   * Die Zweige wachsen aus einem gemeinsamen Fuß nach oben auseinander
   * und verzweigen sich einmal. Gestreute Einzelstriche ergäben Stroh;
   * was einen Busch ausmacht, ist, dass alles von EINER Stelle kommt.
   */
  const striche = [];
  const n = 7 + ((rng() * 4) | 0);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI * 0.82 + (i / (n - 1)) * Math.PI * 0.64 + (rng() - 0.5) * 0.3;
    const len = 30 + rng() * 26;
    const x1 = cx + Math.cos(a) * len;
    const y1 = baseY + Math.sin(a) * len;
    striche.push([cx + (rng() - 0.5) * 6, baseY, x1, y1, 1.9]);
    // Eine Gabel auf halber Höhe
    const mx = cx + Math.cos(a) * len * 0.55;
    const my = baseY + Math.sin(a) * len * 0.55;
    const a2 = a + (rng() < 0.5 ? -1 : 1) * (0.4 + rng() * 0.3);
    striche.push([mx, my, mx + Math.cos(a2) * len * 0.42,
      my + Math.sin(a2) * len * 0.42, 1.3]);
  }

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.0,
    shadow: function (g) { groundShadow(g, cx + 3, baseY - 2, 22, 6, seed + 1, 0.16); },
    wash: function (g) {
      // Nur ein Hauch erdige Farbe am Fuß – damit er koloriert nicht als
      // reine Strichzeichnung in einer gemalten Welt steht.
      wash(g, smoothClosed(blob(cx, baseY - 18, 26, 18, seed + 2, 0.24, 14), 5),
        o.holz || ink.duerr, { seed: seed + 3, alpha: 0.3 });
    },
    ink: function (g) {
      for (let i = 0; i < striche.length; i++) {
        const s = striche[i];
        inkLine(g, s[0], s[1], s[2], s[3], {
          width: s[4], bend: (makeRng(seed + 300 + i)() - 0.5) * 0.22,
          seed: seed + 400 + i, alpha: 0.68,
        });
      }
      // Ein paar vertrocknete Blattreste, sonst ist es ein Reisigbündel.
      if (o.blattreste !== false) {
        const r2 = makeRng(seed + 700);
        for (let k = 0; k < 5; k++) {
          const s = striche[(r2() * striche.length) | 0];
          const t = 0.4 + r2() * 0.5;
          const px = s[0] + (s[2] - s[0]) * t;
          const py = s[1] + (s[3] - s[1]) * t;
          inkStroke(g, smoothClosed(blob(px, py, 4.5, 3, seed + 800 + k, 0.2, 8), 4), {
            closed: true, width: 1.2, vary: 0.3,
            seed: seed + 850 + k, alpha: 0.5, color: ink.line,
          });
        }
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

/**
 * Dünengras – harte Büschel, die im Sand stehen.
 *
 * Anders als das Wiesengras am Boden ist das hier ein Gegenstand: höher,
 * steifer, in getrennten Horsten. Es ist das, was eine Düne von einer
 * leeren Sandfläche unterscheidet.
 */
export function paintDuenengras(opts) {
  const o = opts || {};
  const seed = o.seed || 3501;
  const rng = makeRng(seed >>> 0);
  const w = 88;
  const h = 96;
  const cx = w / 2;
  const baseY = h - 8;

  const halme = [];
  const n = 9 + ((rng() * 5) | 0);
  for (let i = 0; i < n; i++) {
    const fuss = cx + (rng() - 0.5) * 20;
    const hoehe = 34 + rng() * 38;
    const neigung = (rng() - 0.5) * 34;
    halme.push([fuss, baseY, fuss + neigung, baseY - hoehe, neigung]);
  }

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.0,
    shadow: function (g) { groundShadow(g, cx + 2, baseY - 2, 18, 5, seed + 1, 0.15); },
    wash: function (g) {
      wash(g, smoothClosed(blob(cx, baseY - 6, 22, 7, seed + 2, 0.22, 12), 4),
        o.farbe || ink.steppeDunkel, { seed: seed + 3, alpha: 0.5 });
    },
    ink: function (g) {
      for (let i = 0; i < halme.length; i++) {
        const b = halme[i];
        // Die Biegung folgt der Neigung: Ein Halm, der nach rechts steht,
        // ist auch nach rechts gebogen. Umgekehrt sieht er geknickt aus.
        inkLine(g, b[0], b[1], b[2], b[3], {
          width: 1.7, bend: b[4] > 0 ? 0.16 : -0.16,
          seed: seed + 100 + i, alpha: 0.6, color: ink.line,
        });
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

/**
 * Steppengras – das Gegenstück zum Dünengras, aber in Ähren.
 *
 * Die Steppe ist nicht Wüste: Hier wächst etwas, es ist nur trocken. Der
 * Unterschied im Bild sind die Ähren – schwere Köpfe, die sich neigen,
 * statt steifer Spitzen, die stehen.
 */
export function paintSteppengras(opts) {
  const o = opts || {};
  const seed = o.seed || 3601;
  const rng = makeRng(seed >>> 0);
  const w = 100;
  const h = 118;
  const cx = w / 2;
  const baseY = h - 8;

  const halme = [];
  const n = 7 + ((rng() * 4) | 0);
  for (let i = 0; i < n; i++) {
    const fuss = cx + (rng() - 0.5) * 24;
    const hoehe = 48 + rng() * 44;
    const neigung = (rng() - 0.5) * 40;
    halme.push({
      x0: fuss, x1: fuss + neigung, y1: baseY - hoehe,
      ahre: rng() < 0.75, s: neigung > 0 ? 1 : -1,
    });
  }

  function ahrenform(hm) {
    return smoothClosed(blob(hm.x1 + hm.s * 3, hm.y1 + 7, 4.5, 11,
      seed + 200 + hm.y1, 0.14, 12), 4);
  }

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.1,
    outline: 1.2,
    shadow: function (g) { groundShadow(g, cx + 3, baseY - 2, 22, 6, seed + 1, 0.15); },
    wash: function (g) {
      wash(g, smoothClosed(blob(cx, baseY - 8, 26, 9, seed + 2, 0.22, 12), 4),
        ink.steppeDunkel, { seed: seed + 3, alpha: 0.45 });
      for (let i = 0; i < halme.length; i++) {
        if (!halme[i].ahre) continue;
        wash(g, ahrenform(halme[i]), o.farbe || ink.steppe,
          { seed: seed + 20 + i, scale: 1.06 });
      }
    },
    shape: function (g) {
      for (let i = 0; i < halme.length; i++) {
        if (halme[i].ahre) fill(g, ahrenform(halme[i]));
      }
    },
    ink: function (g) {
      for (let i = 0; i < halme.length; i++) {
        const hm = halme[i];
        inkLine(g, hm.x0, baseY, hm.x1, hm.y1, {
          width: 1.6, bend: hm.s * 0.18, seed: seed + 100 + i, alpha: 0.55,
        });
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

/**
 * Distel – der Farbtupfer der Steppe.
 *
 * Eine Zone, in der alles gelbbraun ist, liest sich als Dunst. Die Distel
 * ist das Violett dagegen, und weil sie stachelig ist, passt sie zur
 * Zone, statt wie eine vergessene Gartenblume auszusehen.
 */
export function paintDistel(opts) {
  const o = opts || {};
  const seed = o.seed || 3701;
  const rng = makeRng(seed >>> 0);
  const w = 72;
  const h = 108;
  const cx = w / 2;
  const baseY = h - 8;
  const kopfY = 28 + rng() * 8;

  /**
   * Ein Stiel, kein Stamm.
   *
   * Zuerst stand hier eine halbe Breite von 3,5 Punkten auf 70 Punkten
   * Höhe – im Bild ein Baumstumpf mit einer Blüte obendrauf. Eine Distel
   * ist dünn und hoch; dass sie trotzdem steht, ist ja gerade ihr
   * Kunststück. Jetzt 1,8 Punkte, und unten minimal breiter als oben.
   */
  const stiel = smoothClosed([
    [cx - 2.2, baseY], [cx - 2, baseY - 34], [cx - 1.6, kopfY + 14],
    [cx + 1.6, kopfY + 14], [cx + 2, baseY - 34], [cx + 2.2, baseY],
  ], 4);
  // Der Kelch unter dem Kopf: stachelig, und deshalb keine runde Form,
  // sondern ein Klecks mit hoher Unruhe.
  const kelch = smoothClosed(blob(cx, kopfY + 9, 11, 9, seed + 1, 0.3, 14), 4);
  const kopf = smoothClosed(blob(cx, kopfY, 12, 11, seed + 2, 0.18, 14), 5);
  // Distelblätter sind fiedrig eingeschnitten, nicht oval. Die hohe
  // Unruhe im Klecks macht genau das, und zwar billiger als eine
  // gezackte Form von Hand.
  const blatt1 = smoothClosed(blob(cx - 13, baseY - 40, 13, 4, seed + 3, 0.46, 14), 3);
  const blatt2 = smoothClosed(blob(cx + 12, baseY - 58, 11, 3.5, seed + 4, 0.46, 14), 3);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.0,
    outline: 1.3,
    shadow: function (g) { groundShadow(g, cx, baseY - 2, 14, 5, seed + 5, 0.13); },
    wash: function (g) {
      wash(g, stiel, ink.steppeDunkel, { seed: seed + 6, dx: 0, dy: 0 });
      wash(g, blatt1, ink.steppe, { seed: seed + 7 });
      wash(g, blatt2, ink.steppe, { seed: seed + 8 });
      wash(g, kelch, ink.steppeDunkel, { seed: seed + 9, scale: 1.05 });
      wash(g, kopf, o.farbe || ink.distel, { seed: seed + 10, scale: 1.08 });
    },
    shape: function (g) {
      fill(g, stiel); fill(g, blatt1); fill(g, blatt2);
      fill(g, kelch); fill(g, kopf);
    },
    ink: function (g) {
      // Die Fäden des Blütenkopfs – nach oben auseinanderlaufend.
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI * 0.86 + (i / 8) * Math.PI * 0.72;
        inkLine(g, cx + Math.cos(a) * 4, kopfY + Math.sin(a) * 3,
          cx + Math.cos(a) * 14, kopfY + Math.sin(a) * 13,
          { width: 1.2, bend: 0, seed: seed + 40 + i, alpha: 0.5 });
      }
      // Die Stacheln am Kelch
      for (let i = 0; i < 6; i++) {
        const a = -0.3 + i * 0.5;
        inkLine(g, cx + Math.cos(a) * 9, kopfY + 9 + Math.sin(a) * 7,
          cx + Math.cos(a) * 15, kopfY + 9 + Math.sin(a) * 11,
          { width: 1.1, bend: 0, seed: seed + 60 + i, alpha: 0.55 });
      }
      inkLine(g, cx, baseY - 6, cx, kopfY + 18,
        { width: 1.3, bend: 0.02, seed: seed + 80, alpha: 0.35 });
    },
  });
  return made(res, w, h, cx, baseY);
}

/**
 * Tierschädel – das eine Ding in der Wüste, das nicht wächst.
 *
 * Eine Landschaft braucht neben Pflanzen etwas, das erzählt. Der Schädel
 * sagt in einem Bild, dass es hier kein Wasser gibt, und er ist das
 * Fundstück, wegen dem man in die Wüste läuft.
 */
export function paintSchaedel(opts) {
  const o = opts || {};
  const seed = o.seed || 3801;
  const w = 104;
  const h = 72;
  const cx = w / 2;
  const baseY = h - 8;

  /**
   * Oben breit, unten schmal – und die Hörner müssen weit ausholen.
   *
   * Der erste Entwurf war fast quadratisch, mit zwei kurzen Stummeln
   * oben: Gezeichnet las sich das als Hundekopf mit Ohren, nicht als
   * Schädel. Zwei Dinge machen den Unterschied, und beide sind Form,
   * nicht Detail. Erstens die Schnauze: Ein Rinderschädel ist oben an
   * den Augenhöhlen am breitesten und läuft nach unten schmal zu.
   * Zweitens die Hörner: Sie sind zusammen BREITER als der Kopf hoch
   * ist, gehen fast waagerecht heraus und biegen erst am Ende nach oben.
   */
  const kopf = smoothClosed([
    [cx - 7, baseY], [cx - 9, baseY - 9],
    [cx - 12, baseY - 20], [cx - 17, baseY - 30],
    [cx - 15, baseY - 40], [cx - 7, baseY - 44],
    [cx + 7, baseY - 44], [cx + 15, baseY - 40],
    [cx + 17, baseY - 30], [cx + 12, baseY - 20],
    [cx + 9, baseY - 9], [cx + 7, baseY],
  ], 5);
  const horn = function (s) {
    return smoothClosed([
      [cx + s * 13, baseY - 40],
      [cx + s * 28, baseY - 44], [cx + s * 41, baseY - 42],
      [cx + s * 48, baseY - 34], [cx + s * 49, baseY - 24],
      [cx + s * 44, baseY - 25], [cx + s * 43, baseY - 33],
      [cx + s * 36, baseY - 37], [cx + s * 26, baseY - 38],
      [cx + s * 14, baseY - 34],
    ], 5);
  };
  const teile = [kopf, horn(-1), horn(1)];

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.1,
    outline: 1.5,
    shadow: function (g) { groundShadow(g, cx + 4, baseY - 2, 30, 7, seed + 1, 0.2); },
    wash: function (g) {
      for (let i = 0; i < teile.length; i++) {
        wash(g, teile[i], ink.knochen, { seed: seed + 10 + i, scale: 1.04 });
        wash(g, offsetShape(teile[i], -LIGHT.x * 7, -LIGHT.y * 6, 0.68),
          ink.rockShade, { seed: seed + 20 + i, alpha: 0.42 });
      }
    },
    shape: function (g) { for (let i = 0; i < teile.length; i++) fill(g, teile[i]); },
    ink: function (g) {
      // Augenhöhlen und Nasenloch – als gefüllte Tusche, nicht als Umriss:
      // Eine Höhle ist ein Loch, und ein Loch ist dunkel.
      g.save();
      g.fillStyle = ink.line;
      g.globalAlpha = 0.8;
      pathFrom(g, smoothClosed(blob(cx - 8, baseY - 33, 5, 4.5, seed + 30, 0.18, 10), 4), true);
      g.fill();
      pathFrom(g, smoothClosed(blob(cx + 8, baseY - 33, 5, 4.5, seed + 31, 0.18, 10), 4), true);
      g.fill();
      g.globalAlpha = 0.6;
      pathFrom(g, smoothClosed(blob(cx, baseY - 19, 3, 5, seed + 32, 0.2, 10), 4), true);
      g.fill();
      g.restore();
      // Die Naht über der Stirn
      inkLine(g, cx, baseY - 43, cx, baseY - 37,
        { width: 1.3, bend: 0, seed: seed + 40, alpha: 0.45 });
      // Die Zahnreihe unten – das zweite Zeichen nach den Hörnern.
      for (let k = 0; k < 4; k++) {
        const x = cx - 4.5 + k * 3;
        inkLine(g, x, baseY - 7, x, baseY - 1,
          { width: 1.1, bend: 0, seed: seed + 60 + k, alpha: 0.4 });
      }
      // Die Rillen der Hörner, dem Bogen folgend
      for (let s = -1; s <= 1; s += 2) {
        for (let k = 0; k < 4; k++) {
          const t = 0.25 + k * 0.2;
          inkLine(g, cx + s * (14 + t * 32), baseY - 40 - t * 2,
            cx + s * (14 + t * 32), baseY - 35 + t * 2,
            { width: 1.1, bend: 0, seed: seed + 70 + k + (s > 0 ? 9 : 0), alpha: 0.38 });
        }
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

/**
 * Wüstenfels – flach geschichtet, vom Wind abgeschliffen.
 *
 * Der Stein der gemäßigten Zone (`paintRock`) ist ein rundlicher Findling
 * aus dem Eis. In der Wüste schichtet der Wind waagerecht ab, und genau
 * diese Schichtung ist das Zeichen, an dem man die Zone erkennt – es
 * lohnt sich deshalb, einen eigenen Stein zu haben statt denselben
 * umzufärben.
 */
export function paintWuestenfels(opts) {
  const o = opts || {};
  const seed = o.seed || 3901;
  const rng = makeRng(seed >>> 0);
  const skala = o.scale == null ? 1 : o.scale;
  const w = Math.round(126 * skala);
  const h = Math.round(92 * skala);
  const cx = w / 2;
  const baseY = h - 8;

  const bloecke = [];
  let by = baseY;
  const n = 3 + ((rng() * 2) | 0);
  for (let i = 0; i < n; i++) {
    const rx = (34 - i * 6 + rng() * 6) * skala;
    const ry = (10 + rng() * 5) * skala;
    const vx = (rng() - 0.5) * 10 * skala;
    bloecke.push(smoothClosed(blob(cx + vx, by - ry, rx, ry, seed + i * 11, 0.13, 16), 5));
    by -= ry * 1.75;
  }

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.2,
    outline: 1.7,
    shadow: function (g) { groundShadow(g, cx + 5, baseY - 2, 34 * skala, 9 * skala, seed + 1, 0.22); },
    wash: function (g) {
      for (let i = 0; i < bloecke.length; i++) {
        wash(g, bloecke[i], o.stein || ink.duerr, { seed: seed + 10 + i, scale: 1.04 });
        wash(g, offsetShape(bloecke[i], -LIGHT.x * 9, -LIGHT.y * 7, 0.7),
          ink.duerrDunkel, { seed: seed + 20 + i, alpha: 0.55 });
        wash(g, offsetShape(bloecke[i], LIGHT.x * 9, LIGHT.y * 6, 0.42),
          ink.duene, { seed: seed + 30 + i, alpha: 0.6 });
      }
    },
    shape: function (g) { for (let i = 0; i < bloecke.length; i++) fill(g, bloecke[i]); },
    ink: function (g) {
      // Die Schichtfugen: waagerecht, über die ganze Breite, leicht wellig.
      for (let i = 0; i < bloecke.length; i++) {
        inkStroke(g, offsetShape(bloecke[i], 0, 0, 0.94), {
          closed: true, width: 1.5, vary: 0.4,
          seed: seed + 40 + i, alpha: 0.34, color: ink.line,
        });
      }
      const r2 = makeRng(seed + 600);
      for (let k = 0; k < 5; k++) {
        const y = baseY - 8 * skala - r2() * (baseY - 24 * skala);
        const x0 = cx - (18 + r2() * 14) * skala;
        inkLine(g, x0, y, x0 + (20 + r2() * 20) * skala, y + (r2() - 0.5) * 4,
          { width: 1.2, bend: 0.04, seed: seed + 650 + k, alpha: 0.3 });
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

export { slab };
