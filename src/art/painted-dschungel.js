/**
 * Die Flora der feuchten Zonen – Dschungel und Mangrove.
 *
 * Das Gegenstück zu `painted-wueste.js`, und zwar in jeder Hinsicht: Dort
 * ist Wasser knapp und die Pflanzen sparen Fläche, hier ist Wasser im
 * Überfluss und es wird um LICHT gekämpft. Daraus folgt zeichnerisch:
 *
 *   1. **Große Blätter.** Wo Wasser kein Problem ist, lohnt sich jede
 *      Fläche, die Licht abfängt. Statt vieler kleiner Lappen (Eiche) gibt
 *      es hier wenige, große, einzeln erkennbare Blätter.
 *   2. **Schichten.** Ein Regenwald ist nicht eine Krone, sondern vier
 *      übereinander. Deshalb trägt fast jeder Maler hier mehrere Grüns
 *      gleichzeitig – ein tiefes im Schatten, ein helles obenauf.
 *   3. **Senkrechte.** Lianen, Bambus, Stelzwurzeln: Im Dschungel hängt
 *      und steht etwas zwischen Boden und Krone, und genau das fehlt
 *      einem Wald aus lauter freistehenden Bäumen.
 *
 * Das Grün ist das tiefste im Spiel (`dschungel`, Helligkeit 88). Das ist
 * Absicht und gemessen: Die Zonen sollen sich in der Helligkeit
 * unterscheiden, nicht nur im Ton – Wüste hell, gemäßigt mittel,
 * Dschungel dunkel.
 */
import {
  blob, teardrop, smoothClosed, offsetShape, pathFrom,
  inkStroke, inkLine, wash, washGroup, paintObject, groundShadow, LIGHT,
} from './brush.js';
import { INK as ink, fill, made, dot, leafClumps } from './painted.js';
import { makeRng } from '../core/rng.js';

/**
 * Dschungelbaum – breiter als hoch, mit Schirmkrone.
 *
 * Der Unterschied zur Eiche ist nicht die Farbe, sondern die Silhouette.
 * Ein Waldbaum in unseren Breiten ist etwa so breit wie hoch; ein Baum
 * im Kronendach wächst, bis er Licht hat, und breitet sich dann flach
 * aus. Deshalb ein kahler Stamm über zwei Dritteln der Höhe und erst
 * oben eine flache, weite Krone.
 */
export function paintDschungelbaum(opts) {
  const o = opts || {};
  const seed = o.seed || 4101;
  const rng = makeRng(seed >>> 0);
  /**
   * Schmal und hoch, nicht breit und flach.
   *
   * Der erste Entwurf hatte eine Schirmkrone von 232 Punkten Breite –
   * 3,6 Kacheln, also gut 10 Kacheln Kronenfläche. Bei der Dichte des
   * Dschungels (8,4 Bäume je 100 Kacheln) decken die Kronen ALLEIN 86
   * Prozent des Bodens ab. Nachgerechnet neben Eiche (26 Prozent) und
   * Kiefer (46) war sofort klar, warum vorher nichts geholfen hat: Ich
   * hatte die Zahl der Pflanzen am Boden fast halbiert, und das Bild
   * blieb zu, weil darunter gar kein Boden mehr zu sehen war.
   *
   * Die Schirmkrone ist die Form eines FREI stehenden Tropenbaums. Im
   * geschlossenen Bestand wachsen sie schmal nach oben – sie kämpfen um
   * Licht, nicht um Platz –, und zwischen den Kronen bleiben Lücken.
   * Die richtige Form ist hier also auch die botanisch richtige, und das
   * ist meistens ein gutes Zeichen.
   *
   * Jetzt 178 Punkte: 2,8 Kacheln, gut 6 Kacheln Fläche, rund die
   * Hälfte der alten Deckung. Dafür 16 Punkte höher.
   */
  const w = 178;
  const h = 252;
  const cx = w / 2;
  const baseY = h - 12;
  const kroneY = baseY - 182;

  /**
   * Brettwurzeln – die Stützen am Fuß tropischer Riesen.
   *
   * Sie sind das zweite Erkennungszeichen nach der Schirmkrone, und sie
   * kosten fast nichts: drei Dreiecke am Stammfuß. Ohne sie steht der
   * Baum auf einem Stock, und bei dieser Kronenbreite sieht das falsch
   * aus – das Auge erwartet, dass so viel Last abgestützt wird.
   */
  // Schmaler und dunkler als die Eiche.
  //
  // Zuerst stand hier 16 Punkte halbe Breite und `ink.bark` – gerendert
  // war das ein lachsfarbener Pfeiler, breiter als die Brettwurzeln
  // hoch sind, und die Wurzeln lasen sich als Rock darunter. Ein
  // Tropenriese ist im Verhältnis zur Krone DÜNN; das ist ja der Grund,
  // warum er Brettwurzeln überhaupt braucht.
  const stammB = 11;
  const wurzeln = [];
  for (let i = -1; i <= 1; i++) {
    if (i === 0) continue;
    wurzeln.push(smoothClosed([
      [cx + i * (stammB - 1), baseY - 58],
      [cx + i * (stammB + 10), baseY - 30],
      [cx + i * (stammB + 21), baseY - 2],
      [cx + i * (stammB + 23), baseY],
      [cx + i * (stammB - 3), baseY],
    ], 4));
  }
  wurzeln.push(smoothClosed([
    [cx - 6, baseY - 52], [cx - 11, baseY], [cx + 11, baseY], [cx + 6, baseY - 52],
  ], 4));

  const stamm = smoothClosed([
    [cx - stammB, baseY], [cx - stammB + 1, baseY - 70],
    [cx - 9, kroneY + 40], [cx + 9, kroneY + 38],
    [cx + stammB - 1, baseY - 72], [cx + stammB, baseY],
  ], 5);

  /**
   * Die Krone: flache, weit ausladende Lappen in einer Reihe statt eines
   * Balls. Zwei Ebenen – eine hintere, dunklere und eine vordere – damit
   * man sieht, dass da Laub ÜBEREINANDER liegt.
   */
  const hinten = [];
  const vorne = [];
  for (let i = 0; i < 4; i++) {
    const t = (i / 3 - 0.5) * 2;
    hinten.push(smoothClosed(blob(cx + t * 52, kroneY + 4 + Math.abs(t) * 16,
      31 + rng() * 8, 23 + rng() * 7, seed + 10 + i, 0.2), 7));
  }
  for (let i = 0; i < 3; i++) {
    const t = (i / 2 - 0.5) * 2;
    vorne.push(smoothClosed(blob(cx + t * 38, kroneY + 26 + Math.abs(t) * 10,
      29 + rng() * 7, 20 + rng() * 6, seed + 30 + i, 0.2), 7));
  }
  const lappen = hinten.concat(vorne);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.7,
    outline: 2.0,
    shadow: function (g) { groundShadow(g, cx + 5, baseY - 3, 46, 13, seed + 1, 0.2); },
    wash: function (g) {
      for (let i = 0; i < wurzeln.length; i++) {
        wash(g, wurzeln[i], ink.barkDark, { seed: seed + 50 + i, scale: 1.03 });
      }
      wash(g, stamm, ink.barkDark, { seed: seed + 60, dx: -2, dy: 2, scale: 1.04 });
      wash(g, offsetShape(stamm, 7, 4, 0.6), ink.schlick, { seed: seed + 61, alpha: 0.8 });

      for (let i = 0; i < hinten.length; i++) {
        wash(g, hinten[i], ink.dschungelDunkel, { seed: seed + 70 + i, scale: 1.05 });
      }
      for (let i = 0; i < vorne.length; i++) {
        wash(g, vorne[i], o.laub || ink.dschungel, { seed: seed + 80 + i, scale: 1.05 });
      }
      // Die Schattenseite als Gruppe, damit sich die Überlappungen nicht
      // zu einem Verlauf addieren (dieselbe Regel wie bei der Eiche).
      const schatten = [];
      for (let i = 0; i < lappen.length; i++) {
        schatten.push(offsetShape(lappen[i], -LIGHT.x * 16, -LIGHT.y * 14, 0.8));
      }
      washGroup(g, schatten, ink.dschungelTief, { alpha: 0.5 });
      washGroup(g, [
        offsetShape(vorne[1], LIGHT.x * 18, LIGHT.y * 15, 0.6),
        offsetShape(hinten[1], LIGHT.x * 20, LIGHT.y * 16, 0.55),
      ], ink.dschungelLicht, { alpha: 0.75 });
    },
    shape: function (g) {
      for (let i = 0; i < wurzeln.length; i++) fill(g, wurzeln[i]);
      fill(g, stamm);
      for (let i = 0; i < lappen.length; i++) fill(g, lappen[i]);
    },
    detail: function (g) {
      leafClumps(g, cx, kroneY + 16, 62, 32, seed + 500, ink.dschungelTief);
    },
    ink: function (g) {
      // Die Kanten der vorderen Lappen – dort, wo sie vor den hinteren
      // liegen. Das ist die Linie, die aus zwei Flächen eine Schichtung
      // macht.
      for (let i = 0; i < vorne.length; i++) {
        inkStroke(g, offsetShape(vorne[i], 0, 0, 0.97), {
          closed: true, width: 1.7, vary: 0.4,
          seed: seed + 200 + i, alpha: 0.3, color: ink.line,
        });
      }
      // Die Fugen zwischen den Brettwurzeln
      for (let i = 0; i < wurzeln.length; i++) {
        inkStroke(g, wurzeln[i], {
          closed: true, width: 1.6, vary: 0.35,
          seed: seed + 220 + i, alpha: 0.38, color: ink.line,
        });
      }
      // Rinde: lange senkrechte Striche, weil ein Tropenstamm glatt und
      // hoch ist – keine rissige Eichenborke.
      for (let i = 0; i < 3; i++) {
        const x = cx - 5 + i * 5;
        inkLine(g, x, baseY - 56, x + 2, kroneY + 46,
          { width: 1.3, bend: 0.015, seed: seed + 240 + i, alpha: 0.32 });
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

/**
 * Palme – ein Bogen mit Wedeln obendrauf.
 *
 * Sie steht am Übergang zwischen Strand und Dschungel und ist damit die
 * Pflanze, die zwei Zonen verbindet. Was eine Palme ausmacht, ist der
 * GEBOGENE Stamm: Eine senkrechte Palme sieht aus wie ein Besen.
 */
export function paintPalme(opts) {
  const o = opts || {};
  const seed = o.seed || 4201;
  const rng = makeRng(seed >>> 0);
  const neigung = (o.neigung == null ? (rng() - 0.5) * 2 : o.neigung);
  const hoehe = 186 + rng() * 34;
  const versatz = neigung * 46;
  const w = Math.round(212 + Math.abs(versatz));
  const h = Math.round(hoehe + 36);
  const cx = w / 2 - versatz / 2;
  const baseY = h - 12;
  const kronX = cx + versatz;
  const kronY = baseY - hoehe;

  // Der Stamm als Band: unten breit, oben schmal, in einem Bogen.
  const stammPkt = [];
  const rueck = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    const b = 13 - t * 6;
    // Der Bogen: quadratisch, damit die Neigung unten null ist und oben
    // am stärksten. Ein Baum steht senkrecht aus dem Boden.
    const x = cx + versatz * t * t;
    const y = baseY - hoehe * t;
    stammPkt.push([x - b, y]);
    rueck.unshift([x + b, y]);
  }
  const stamm = smoothClosed(stammPkt.concat(rueck), 4);

  /** Die Wedel: je ein Bogen nach außen, hängend. */
  const wedel = [];
  const nW = 6 + ((rng() * 3) | 0);
  for (let i = 0; i < nW; i++) {
    const a = -Math.PI * 0.95 + (i / (nW - 1)) * Math.PI * 0.9 + (rng() - 0.5) * 0.18;
    const len = 62 + rng() * 30;
    const sx = Math.cos(a);
    const sy = Math.sin(a) * 0.68;
    const tipX = kronX + sx * len;
    // Die Spitze hängt: Ein Palmwedel ist zu lang, um sich selbst zu
    // tragen, und genau dieses Durchhängen liest man als „Palme".
    const tipY = kronY + sy * len + Math.abs(sx) * len * 0.42;
    const mx = kronX + sx * len * 0.55;
    const my = kronY + sy * len * 0.6;
    wedel.push({
      pts: smoothClosed([
        [kronX, kronY + 4],
        [mx - sy * 9, my + sx * 9],
        [tipX, tipY],
        [mx + sy * 9, my - sx * 9],
      ], 4),
      tipX: tipX, tipY: tipY, mx: mx, my: my, sx: sx,
    });
  }
  wedel.sort(function (p, q) { return p.tipY - q.tipY; });

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.5,
    outline: 1.8,
    shadow: function (g) { groundShadow(g, cx + 5, baseY - 3, 34, 10, seed + 1, 0.2); },
    wash: function (g) {
      wash(g, stamm, ink.bark, { seed: seed + 10, scale: 1.04 });
      wash(g, offsetShape(stamm, 7, 3, 0.62), ink.barkDark, { seed: seed + 11, alpha: 0.75 });
      for (let i = 0; i < wedel.length; i++) {
        wash(g, wedel[i].pts, o.laub || ink.dschungel, { seed: seed + 20 + i, scale: 1.04 });
        wash(g, offsetShape(wedel[i].pts, -LIGHT.x * 9, -LIGHT.y * 8, 0.62),
          ink.dschungelDunkel, { seed: seed + 40 + i, alpha: 0.5 });
      }
      if (o.kokos) {
        for (let i = 0; i < 3; i++) {
          dot(g, null, kronX - 10 + i * 10, kronY + 14 + (i === 1 ? 4 : 0),
            7, ink.barkDark, seed + 70 + i);
        }
      }
    },
    shape: function (g) {
      fill(g, stamm);
      for (let i = 0; i < wedel.length; i++) fill(g, wedel[i].pts);
    },
    ink: function (g) {
      // Die Mittelrippe jedes Wedels, und die Fiedern daran. Ohne die
      // Fiedern ist ein Wedel ein grünes Blatt, kein Palmwedel.
      for (let i = 0; i < wedel.length; i++) {
        const v = wedel[i];
        inkLine(g, kronX, kronY + 4, v.tipX, v.tipY,
          { width: 1.6, bend: 0.06 * (v.sx > 0 ? 1 : -1), seed: seed + 100 + i, alpha: 0.45 });
        for (let k = 1; k <= 4; k++) {
          const t = k / 5;
          const px = kronX + (v.tipX - kronX) * t;
          const py = kronY + 4 + (v.tipY - kronY - 4) * t;
          const dx = (v.tipX - kronX) / 90;
          const dy = (v.tipY - kronY) / 90;
          inkLine(g, px, py, px - dy * 11, py + dx * 11,
            { width: 1.1, bend: 0, seed: seed + 130 + i * 4 + k, alpha: 0.32 });
          inkLine(g, px, py, px + dy * 11, py - dx * 11,
            { width: 1.1, bend: 0, seed: seed + 170 + i * 4 + k, alpha: 0.32 });
        }
      }
      // Die Blattnarben am Stamm – die Ringe, die abgefallene Wedel
      // hinterlassen. Das ist das Zeichen, an dem man einen Palmstamm
      // von jedem anderen unterscheidet.
      for (let k = 0; k < 9; k++) {
        const t = 0.06 + k * 0.1;
        const x = cx + versatz * t * t;
        const y = baseY - hoehe * t;
        const b = 13 - t * 6;
        inkLine(g, x - b + 1, y, x + b - 1, y - 2,
          { width: 1.3, bend: 0.1, seed: seed + 220 + k, alpha: 0.4 });
      }
      if (o.kokos) {
        for (let i = 0; i < 3; i++) {
          dot(null, g, kronX - 10 + i * 10, kronY + 14 + (i === 1 ? 4 : 0),
            7, ink.barkDark, seed + 70 + i);
        }
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

/**
 * Riesenblatt – ein einzelnes, großes, eingeschnittenes Blatt.
 *
 * Das ist die Pflanze, die den Dschungelboden ausmacht, und sie ist
 * billiger als jeder Baum: EIN Blatt, groß genug, dass man es als Blatt
 * erkennt. Im Unterholz stehen zwanzig davon, und der Boden ist voll.
 */
export function paintRiesenblatt(opts) {
  const o = opts || {};
  const seed = o.seed || 4301;
  const rng = makeRng(seed >>> 0);
  const w = 128;
  const h = 132;
  const cx = w / 2;
  const baseY = h - 8;

  /**
   * Jedes Blatt sitzt auf einem eigenen Stiel.
   *
   * Zuerst gingen alle Blätter direkt vom selben Punkt am Boden aus und
   * waren kurz und breit. Übereinandergelegt ergab das einen grünen
   * Klecks mit Kerben – man sah keine Blätter, sondern eine Fläche. Was
   * fehlt, ist die LÜCKE: Ein Riesenblatt sitzt am Ende eines langen,
   * nackten Stiels, und erst dadurch stehen die Blätter einzeln.
   */
  const blaetter = [];
  const stiele = [];
  const n = 3;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI * 0.78 + (i / (n - 1)) * Math.PI * 0.56 + (rng() - 0.5) * 0.14;
    const stiel = 26 + rng() * 16;
    const len = 44 + rng() * 18;
    const br = 15 + rng() * 5;
    const sx = Math.cos(a);
    const sy = Math.sin(a);
    // Der Blattansatz liegt am Ende des Stiels, nicht am Boden.
    const ax = cx + sx * stiel * 0.5;
    const ay = baseY - 10 + sy * stiel;
    stiele.push([cx, baseY - 6, ax, ay]);
    const tipX = ax + sx * len;
    const tipY = ay + sy * len;
    /**
     * Die Einschnitte sind die halbe Miete.
     *
     * Ein glattes Oval liest sich als Löffel. Die Fiederung – links und
     * rechts tief eingeschnitten – ist das, woran man ein Tropenblatt
     * erkennt, und sie entsteht hier aus Stützpunkten, die abwechselnd
     * nah und fern von der Mittelrippe liegen.
     */
    const pts = [[ax, ay]];
    for (let k = 1; k <= 4; k++) {
      const t = k / 5;
      const tief = k % 2 ? 1 : 0.42;
      pts.push([ax + sx * len * t - sy * br * tief, ay + sy * len * t + sx * br * tief]);
    }
    pts.push([tipX, tipY]);
    for (let k = 4; k >= 1; k--) {
      const t = k / 5;
      const tief = k % 2 ? 1 : 0.42;
      pts.push([ax + sx * len * t + sy * br * tief, ay + sy * len * t - sx * br * tief]);
    }
    blaetter.push({ pts: smoothClosed(pts, 3), ax: ax, ay: ay, tipX: tipX, tipY: tipY });
  }
  blaetter.sort(function (p, q) { return p.tipY - q.tipY; });

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.2,
    outline: 1.6,
    shadow: function (g) { groundShadow(g, cx + 3, baseY - 2, 26, 8, seed + 1, 0.18); },
    wash: function (g) {
      for (let i = 0; i < blaetter.length; i++) {
        wash(g, blaetter[i].pts, o.laub || ink.dschungel, { seed: seed + 10 + i, scale: 1.04 });
        wash(g, offsetShape(blaetter[i].pts, -LIGHT.x * 10, -LIGHT.y * 9, 0.6),
          ink.dschungelDunkel, { seed: seed + 20 + i, alpha: 0.5 });
        wash(g, offsetShape(blaetter[i].pts, LIGHT.x * 9, LIGHT.y * 8, 0.38),
          ink.dschungelLicht, { seed: seed + 30 + i, alpha: 0.55 });
      }
    },
    shape: function (g) { for (let i = 0; i < blaetter.length; i++) fill(g, blaetter[i].pts); },
    ink: function (g) {
      for (let i = 0; i < stiele.length; i++) {
        const st = stiele[i];
        inkLine(g, st[0], st[1], st[2], st[3],
          { width: 2.2, bend: 0.1, seed: seed + 40 + i, alpha: 0.6 });
      }
      for (let i = 0; i < blaetter.length; i++) {
        const b = blaetter[i];
        inkLine(g, b.ax, b.ay, b.tipX, b.tipY,
          { width: 1.8, bend: 0.03, seed: seed + 50 + i, alpha: 0.5 });
        // Seitenadern, paarweise schräg nach außen
        for (let k = 1; k <= 4; k++) {
          const t = k / 5;
          const px = b.ax + (b.tipX - b.ax) * t;
          const py = b.ay + (b.tipY - b.ay) * t;
          const dx = (b.tipX - b.ax) / 70;
          const dy = (b.tipY - b.ay) / 70;
          inkLine(g, px, py, px - dy * 15 + dx * 5, py + dx * 15 + dy * 5,
            { width: 1.1, bend: 0.05, seed: seed + 60 + i * 4 + k, alpha: 0.33 });
          inkLine(g, px, py, px + dy * 15 + dx * 5, py - dx * 15 + dy * 5,
            { width: 1.1, bend: -0.05, seed: seed + 90 + i * 4 + k, alpha: 0.33 });
        }
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

/**
 * Bambus – ein Bündel gegliederter Halme.
 *
 * Die einzige senkrechte Linie im Dschungel und damit der Gegensatz zu
 * allem anderen hier (Schirm, Bogen, Fächer). Die Knoten sind das
 * Zeichen: ein glatter grüner Stab ist ein Stab.
 */
export function paintBambus(opts) {
  const o = opts || {};
  const seed = o.seed || 4401;
  const rng = makeRng(seed >>> 0);
  const w = 124;
  const h = 214;
  const cx = w / 2;
  const baseY = h - 10;

  const halme = [];
  const n = 4 + ((rng() * 3) | 0);
  for (let i = 0; i < n; i++) {
    const x = cx - 32 + (i / Math.max(1, n - 1)) * 64 + (rng() - 0.5) * 8;
    const hoehe = 112 + rng() * 78;
    const b = 5 + rng() * 2.5;
    const lean = (rng() - 0.5) * 14;
    halme.push({
      pts: smoothClosed([
        [x - b, baseY], [x - b + lean * 0.5, baseY - hoehe * 0.5],
        [x - b + lean, baseY - hoehe], [x + b + lean, baseY - hoehe],
        [x + b + lean * 0.5, baseY - hoehe * 0.5], [x + b, baseY],
      ], 3),
      x: x, b: b, hoehe: hoehe, lean: lean,
    });
  }
  halme.sort(function (p, q) { return p.hoehe - q.hoehe; });

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.1,
    outline: 1.4,
    shadow: function (g) { groundShadow(g, cx + 4, baseY - 2, 30, 8, seed + 1, 0.18); },
    wash: function (g) {
      for (let i = 0; i < halme.length; i++) {
        wash(g, halme[i].pts, o.halm || ink.bambus, { seed: seed + 10 + i, scale: 1.03 });
        wash(g, offsetShape(halme[i].pts, -LIGHT.x * 5, 0, 0.55),
          ink.dschungelDunkel, { seed: seed + 20 + i, alpha: 0.4 });
      }
      // Ein paar schmale Blätter oben, sonst sind es Stäbe im Boden.
      for (let i = 0; i < halme.length; i++) {
        const hm = halme[i];
        for (let k = 0; k < 2; k++) {
          const s = k ? 1 : -1;
          wash(g, smoothClosed([
            [hm.x + hm.lean, baseY - hm.hoehe + 6],
            [hm.x + hm.lean + s * 16, baseY - hm.hoehe - 6],
            [hm.x + hm.lean + s * 30, baseY - hm.hoehe - 2],
            [hm.x + hm.lean + s * 14, baseY - hm.hoehe + 10],
          ], 3), o.laub || ink.dschungel, { seed: seed + 60 + i * 2 + k, scale: 1.03 });
        }
      }
    },
    shape: function (g) {
      for (let i = 0; i < halme.length; i++) {
        const hm = halme[i];
        fill(g, hm.pts);
        for (let k = 0; k < 2; k++) {
          const s = k ? 1 : -1;
          fill(g, smoothClosed([
            [hm.x + hm.lean, baseY - hm.hoehe + 6],
            [hm.x + hm.lean + s * 16, baseY - hm.hoehe - 6],
            [hm.x + hm.lean + s * 30, baseY - hm.hoehe - 2],
            [hm.x + hm.lean + s * 14, baseY - hm.hoehe + 10],
          ], 3));
        }
      }
    },
    ink: function (g) {
      for (let i = 0; i < halme.length; i++) {
        const hm = halme[i];
        const knoten = Math.max(2, Math.round(hm.hoehe / 32));
        for (let k = 1; k <= knoten; k++) {
          const t = k / (knoten + 1);
          const y = baseY - hm.hoehe * t;
          const x = hm.x + hm.lean * t;
          inkLine(g, x - hm.b, y, x + hm.b, y - 1,
            { width: 1.8, bend: 0, seed: seed + 100 + i * 9 + k, alpha: 0.6 });
        }
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

/**
 * Liane – hängt von oben ins Bild.
 *
 * Der einzige Gegenstand im Spiel, dessen Ankerpunkt OBEN liegt: Er
 * hängt von einem Ast herab, den man nicht sieht. Genau das macht aus
 * einem Wald einen Dschungel – etwas kommt von über einem herunter.
 */
export function paintLiane(opts) {
  const o = opts || {};
  const seed = o.seed || 4501;
  const rng = makeRng(seed >>> 0);
  const w = 96;
  const h = 164;
  const cx = w / 2;
  // Der Fußpunkt ist OBEN: Die Liane hängt, sie steht nicht. Damit sie
  // beim Sortieren nach y nicht vor dem halben Wald liegt, wird sie an
  // ihrem oberen Ende verankert.
  const ankerY = 14;

  const straenge = [];
  const n = 2 + ((rng() * 2) | 0);
  for (let i = 0; i < n; i++) {
    const x0 = cx - 24 + i * 22 + rng() * 10;
    const laenge = 94 + rng() * 54;
    const schwung = (rng() - 0.5) * 36;
    straenge.push({ x0: x0, x1: x0 + schwung, y1: ankerY + laenge, s: schwung });
  }

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.1,
    outline: 1.3,
    wash: function (g) {
      // Die Blätter an den Strängen – kleine Ovale, abwechselnd links
      // und rechts.
      for (let i = 0; i < straenge.length; i++) {
        const st = straenge[i];
        for (let k = 1; k <= 5; k++) {
          const t = k / 6;
          const px = st.x0 + (st.x1 - st.x0) * t;
          const py = ankerY + (st.y1 - ankerY) * t;
          const s = k % 2 ? -1 : 1;
          wash(g, smoothClosed(blob(px + s * 9, py, 9, 5, seed + 20 + i * 5 + k, 0.2, 12), 4),
            o.laub || ink.dschungel, { seed: seed + 50 + i * 5 + k, scale: 1.05 });
        }
      }
    },
    shape: function (g) {
      for (let i = 0; i < straenge.length; i++) {
        const st = straenge[i];
        for (let k = 1; k <= 5; k++) {
          const t = k / 6;
          const px = st.x0 + (st.x1 - st.x0) * t;
          const py = ankerY + (st.y1 - ankerY) * t;
          const s = k % 2 ? -1 : 1;
          fill(g, smoothClosed(blob(px + s * 9, py, 9, 5, seed + 20 + i * 5 + k, 0.2, 12), 4));
        }
      }
    },
    ink: function (g) {
      for (let i = 0; i < straenge.length; i++) {
        const st = straenge[i];
        inkLine(g, st.x0, ankerY, st.x1, st.y1, {
          width: 2.2, bend: st.s > 0 ? 0.1 : -0.1,
          seed: seed + 100 + i, alpha: 0.62,
        });
      }
    },
  });
  return made(res, w, h, cx, ankerY);
}

/**
 * Orchidee – der Farbtupfer des Unterholzes.
 *
 * Im Dschungel ist alles grün und dunkel; ohne einen hellen Punkt liest
 * sich die Zone als Masse. Die Orchidee ist dieser Punkt, und sie ist
 * selten – ein Ausrufezeichen, das überall steht, ist ein Punkt.
 */
export function paintOrchidee(opts) {
  const o = opts || {};
  const seed = o.seed || 4601;
  const rng = makeRng(seed >>> 0);
  const w = 76;
  const h = 108;
  const cx = w / 2;
  const baseY = h - 8;

  const bogenX = cx + (rng() - 0.5) * 16;
  const bogenY = 26 + rng() * 8;
  /**
   * Zwei große Blüten, nicht drei kleine.
   *
   * Drei Blüten mit je fünf Blättern von sechs Punkten Radius ergaben
   * auf 76 Punkten Breite einen violetten Klumpen – fünfzehn Formen,
   * die sich gegenseitig verdecken. Eine Orchideenblüte IST groß; wenn
   * nur zwei ins Bild passen, dann sind es zwei.
   */
  const blueten = [];
  for (let i = 0; i < 2; i++) {
    const t = i;
    blueten.push([
      cx + (bogenX - cx) * (0.45 + t * 0.55),
      bogenY + (1 - t) * 26,
    ]);
  }
  // Zwei breite, flache Blätter am Fuß – Orchideenblätter sind ledrig
  // und liegen fast waagerecht.
  const blatt1 = smoothClosed(blob(cx - 14, baseY - 10, 16, 6, seed + 1, 0.2, 14), 4);
  const blatt2 = smoothClosed(blob(cx + 13, baseY - 16, 14, 5.5, seed + 2, 0.2, 14), 4);

  function blueteForm(p, k) {
    const teile = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      // Die Blätter zeigen nach außen und sind länger als breit – sonst
      // ist es eine Margerite. Ausrichtung über die eigene Richtung.
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      teile.push(smoothClosed([
        [p[0] + dy * 3.4, p[1] - dx * 3.4],
        [p[0] + dx * 7 + dy * 4.6, p[1] + dy * 7 - dx * 4.6],
        [p[0] + dx * 13, p[1] + dy * 13],
        [p[0] + dx * 7 - dy * 4.6, p[1] + dy * 7 + dx * 4.6],
        [p[0] - dy * 3.4, p[1] + dx * 3.4],
      ], 4));
    }
    return teile;
  }

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.0,
    outline: 1.3,
    shadow: function (g) { groundShadow(g, cx, baseY - 2, 18, 6, seed + 3, 0.13); },
    wash: function (g) {
      wash(g, blatt1, ink.dschungelDunkel, { seed: seed + 4 });
      wash(g, blatt2, ink.dschungelDunkel, { seed: seed + 5 });
      for (let k = 0; k < blueten.length; k++) {
        const teile = blueteForm(blueten[k], k);
        for (let i = 0; i < teile.length; i++) {
          wash(g, teile[i], o.farbe || ink.petalViolet, { seed: seed + 400 + k * 7 + i, scale: 1.06 });
        }
        // Die Lippe in der Mitte – bei Orchideen anders gefärbt als die
        // Blätter drumherum, und das ist ihr Erkennungszeichen.
        wash(g, smoothClosed(blob(blueten[k][0], blueten[k][1], 5.5, 5, seed + 500 + k, 0.14, 10), 4),
          ink.petalYellow, { seed: seed + 520 + k });
      }
    },
    shape: function (g) {
      fill(g, blatt1); fill(g, blatt2);
      for (let k = 0; k < blueten.length; k++) {
        const teile = blueteForm(blueten[k], k);
        for (let i = 0; i < teile.length; i++) fill(g, teile[i]);
      }
    },
    ink: function (g) {
      // Der Blütenstängel: ein Bogen vom Fuß nach oben, an dem die
      // Blüten hängen.
      inkLine(g, cx, baseY - 10, bogenX, bogenY,
        { width: 1.8, bend: 0.2, seed: seed + 600, alpha: 0.55 });
      for (let k = 0; k < blueten.length; k++) {
        const teile = blueteForm(blueten[k], k);
        for (let i = 0; i < teile.length; i++) {
          inkStroke(g, teile[i], {
            closed: true, width: 1.2, vary: 0.3,
            seed: seed + 700 + k * 7 + i, alpha: 0.45, color: ink.line,
          });
        }
      }
      inkLine(g, cx - 26, baseY - 10, cx - 2, baseY - 11,
        { width: 1.2, bend: 0.06, seed: seed + 800, alpha: 0.35 });
    },
  });
  return made(res, w, h, cx, baseY);
}

/**
 * Mangrove – ein Baum, der auf Stelzen im Wasser steht.
 *
 * Das Bindeglied zwischen Dschungel und Küste, und die einzige Pflanze
 * im Spiel, deren Wurzeln man SIEHT. Der Wurzelkorb ist hier das ganze
 * Motiv; die Krone ist absichtlich klein, damit er nicht verdeckt wird.
 */
export function paintMangrove(opts) {
  const o = opts || {};
  const seed = o.seed || 4701;
  const rng = makeRng(seed >>> 0);
  const w = 178;
  const h = 188;
  const cx = w / 2;
  const baseY = h - 10;
  const stammFuss = baseY - 64;
  const kroneY = stammFuss - 54;

  /**
   * Der Wurzelkorb – und er muss sich WÖLBEN.
   *
   * Der erste Entwurf setzte den Mittelpunkt jeder Wurzel einfach auf
   * die halbe Strecke zwischen Ansatz und Fuß. Damit ist eine Wurzel
   * eine Gerade, und sechs Geraden, die sich oben treffen, sind ein
   * Tipi – genau so sah es aus. Eine Stelzwurzel geht dagegen zuerst
   * fast waagerecht vom Stamm weg und biegt dann nach unten ab; der
   * Bogen ist das ganze Motiv, denn nur durch ihn sieht man hindurch.
   *
   * Der Mittelpunkt liegt deshalb bei 85 Prozent der Weite, aber erst
   * bei 45 Prozent der Höhe. Das ist die Wölbung.
   */
  const wurzeln = [];
  const n = 7;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1) - 0.5;
    if (Math.abs(t) < 0.08) continue;
    const s = t < 0 ? -1 : 1;
    const weite = (22 + Math.abs(t) * 66) * s;
    const b = 4 + rng() * 1.8;
    const hoehe = baseY - stammFuss;
    wurzeln.push(smoothClosed([
      [cx + t * 12 - b, stammFuss - 6],
      [cx + weite * 0.85 - b * 1.4, stammFuss + hoehe * 0.45],
      [cx + weite - b, baseY],
      [cx + weite + b, baseY],
      [cx + weite * 0.85 + b * 0.6, stammFuss + hoehe * 0.52],
      [cx + t * 12 + b, stammFuss - 2],
    ], 5));
  }

  const stamm = smoothClosed([
    [cx - 13, stammFuss + 6], [cx - 10, stammFuss - 26],
    [cx - 8, kroneY + 12], [cx + 8, kroneY + 12],
    [cx + 10, stammFuss - 26], [cx + 13, stammFuss + 6],
  ], 5);

  // Breiter als der Wurzelkorb. Eine Mangrove, deren Krone schmaler ist
  // als ihre Wurzeln, liest sich als Gestell mit Hut.
  const krone = [
    smoothClosed(teardrop(cx, kroneY - 8, 52, 34, seed + 1, 0.18), 7),
    smoothClosed(blob(cx - 44, kroneY + 16, 34, 23, seed + 2, 0.2), 7),
    smoothClosed(blob(cx + 46, kroneY + 12, 32, 22, seed + 3, 0.2), 7),
  ];

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.5,
    outline: 1.8,
    shadow: function (g) { groundShadow(g, cx + 4, baseY - 2, 58, 12, seed + 4, 0.18); },
    wash: function (g) {
      for (let i = 0; i < wurzeln.length; i++) {
        wash(g, wurzeln[i], ink.schlick, { seed: seed + 10 + i, scale: 1.03 });
      }
      wash(g, stamm, ink.barkDark, { seed: seed + 30, scale: 1.04 });
      for (let i = 0; i < krone.length; i++) {
        wash(g, krone[i], o.laub || ink.dschungel, { seed: seed + 40 + i, scale: 1.05 });
      }
      const sch = [];
      for (let i = 0; i < krone.length; i++) {
        sch.push(offsetShape(krone[i], -LIGHT.x * 13, -LIGHT.y * 12, 0.78));
      }
      washGroup(g, sch, ink.dschungelTief, { alpha: 0.48 });
      washGroup(g, [offsetShape(krone[0], LIGHT.x * 16, LIGHT.y * 13, 0.6)],
        ink.dschungelLicht, { alpha: 0.7 });
    },
    shape: function (g) {
      for (let i = 0; i < wurzeln.length; i++) fill(g, wurzeln[i]);
      fill(g, stamm);
      for (let i = 0; i < krone.length; i++) fill(g, krone[i]);
    },
    detail: function (g) {
      leafClumps(g, cx, kroneY + 2, 48, 28, seed + 900, ink.dschungelTief);
    },
    ink: function (g) {
      // Jede Wurzel einzeln umreißen: Der Korb lebt davon, dass man
      // durch ihn hindurchsieht, und das sieht man nur an den Kanten.
      for (let i = 0; i < wurzeln.length; i++) {
        inkStroke(g, wurzeln[i], {
          closed: true, width: 1.5, vary: 0.35,
          seed: seed + 100 + i, alpha: 0.42, color: ink.line,
        });
      }
      inkLine(g, cx - 4, stammFuss, cx - 2, kroneY + 16,
        { width: 1.4, bend: 0.03, seed: seed + 200, alpha: 0.35 });
      // Die Wasserlinie: ein waagerechter Strich über den Wurzelfüßen.
      // Ohne ihn steht die Mangrove auf dem Trockenen, und dann ist sie
      // nur ein Baum mit seltsamen Beinen.
      if (o.wasserlinie !== false) {
        inkLine(g, cx - 74, baseY - 12, cx + 74, baseY - 13,
          { width: 1.6, bend: 0.03, seed: seed + 300, alpha: 0.3, color: ink.lineSoft });
      }
    },
  });
  return made(res, w, h, cx, baseY);
}
