/**
 * Höhle und Mühlenboden von innen.
 *
 * Dieselbe Bauart wie das Zimmer in `painted-interior.js`: EIN Bild, Wand
 * oben, Boden darunter, Ausgang unten in der Mitte. Der Unterschied liegt
 * nicht in der Technik, sondern darin, was ein Raum über sich erzählt.
 *
 * **Die Höhle muss nach Stein riechen.** Kein Zimmerboden, keine gerade
 * Kante: Die Wand ist eine zerklüftete Linie, der Boden ist Fels mit
 * Pfützen, und vom Ausgang her fällt Tageslicht herein. Das Licht ist der
 * wichtigste Teil – ohne es ist eine Höhle ein brauner Kasten, mit ihm ein
 * Ort, von dem man weiß, wo draußen liegt.
 *
 * **Die Mühle muss nach Arbeit riechen.** Bretter, Mehlstaub, ein
 * Mahlwerk, das die halbe Wand einnimmt, und ein Fenster, durch das man die
 * Flügel vorbeiziehen sieht. Sie ist der Gegenentwurf zur Höhle: hell,
 * eckig, von Menschen gebaut.
 */
import {
  offsetShape, inkStroke, inkLine, wash, paintObject, smoothClosed, blob, groundShadow,
} from './brush.js';
import { INK as ink, fill, made, poly, dot } from './painted.js';
import { makeRng } from '../core/rng.js';

/**
 * Die Steintöne der Höhle.
 *
 * Kühler und dunkler als jeder Fels draußen. Der Grund ist nicht Realismus,
 * sondern Unterscheidbarkeit: Eine Höhle in denselben warmen Sandtönen wie
 * die Klippe davor sähe aus wie ein Stück Klippe, das man von vorn sieht.
 */
const STEIN = {
  wand: '#6e6760',
  wandTief: '#46423c',
  wandLicht: '#8d8578',
  // Der Boden ist WÄRMER als die Decke, nicht nur heller.
  //
  // In der ersten Fassung war beides dasselbe Grau in zwei Helligkeiten,
  // und das Bild hatte keine einzige warme Stelle – grau in grau ist
  // keine Farbe, sondern ein fehlendes Bild. Jetzt zieht der Boden ins
  // Sandfarbene, weil dort Staub liegt und das Tageslicht hinfällt.
  boden: '#9a8d79',
  bodenTief: '#6b6155',
  bodenLicht: '#c0ae8f',
  pfuetze: '#6f8e92',
  pfuetzeLicht: '#9cc0c0',
  tag: '#f3ecd6',
  tropfstein: '#9b9488',
  // Die Flechten an der Wand sind der einzige warme Ton hier drin – ohne
  // sie ist das Bild grau in grau, und grau in grau ist keine Farbe,
  // sondern ein fehlendes Bild.
  flechte: '#7d9850',
  flechteHell: '#a6c06a',
  funkel: '#bfe2e6',
};

/**
 * Eine Höhle malen.
 *
 * @param {object} opts w, h (Boden), wand (Wandhöhe), ausgang ({x, w}), seed
 */
export function paintHoehle(opts) {
  const o = opts || {};
  const rw = o.w || 780;
  const rh = o.h || 480;
  const wand = o.wand || 150;
  const seed = o.seed || 4200;
  const ausX = o.ausgang ? o.ausgang.x : rw / 2 - 55;
  const ausW = o.ausgang ? o.ausgang.w : 110;
  const w = rw;
  const h = wand + rh;
  const rng = makeRng(seed);

  // Die Deckenkante ist das Gesicht der Höhle.
  //
  // Eine gerade Linie zwischen Decke und Boden macht aus jedem Raum einen
  // Karton – beim Zimmer ist das richtig, hier wäre es falsch. Die Kante
  // zackt deshalb. Sie wird EINMAL gewürfelt und für Fläche, Schatten und
  // Kontur wiederverwendet, sonst liegen die drei nicht übereinander.
  const kante = [];
  const stufen = 9;
  for (let i = 0; i <= stufen; i++) {
    const t = i / stufen;
    const bauch = Math.sin(t * Math.PI) * 16;
    kante.push([t * w, wand - bauch + (rng() - 0.5) * 26]);
  }
  const decke = smoothClosed(kante.concat([[w, 0], [0, 0]]), 2);
  const bodenFlaeche = smoothClosed(kante.concat([[w, h], [0, h]]), 2);

  /**
   * Tropfsteine hängen von der DECKE, nicht aus der Luft.
   *
   * In der ersten Fassung begannen sie bei `wand - 40`, also knapp über
   * dem Boden – im Bild hingen sieben graue Dreiecke frei im Raum, und
   * man sah nicht, woran. Sie beginnen jetzt ganz oben am Bildrand und
   * reichen unterschiedlich weit herunter: Erst dadurch wird die obere
   * Fläche zu einer Decke und nicht zu einer Wand.
   */
  const zapfen = [];
  for (let i = 0; i < 8; i++) {
    const cx = 44 + (i + rng() * 0.5) * ((w - 88) / 8);
    const lang = wand * (0.3 + rng() * 0.62);
    const breit = 13 + rng() * 11;
    zapfen.push(smoothClosed([
      [cx - breit, -6], [cx + breit, -6],
      [cx + breit * 0.34, lang * 0.66], [cx, lang],
      [cx - breit * 0.34, lang * 0.66],
    ], 2));
  }

  /**
   * Und die Gegenstücke wachsen vom Boden hoch.
   *
   * Sie stehen direkt unter der Deckenkante, also ganz hinten im Raum.
   * Ohne sie steht die Kante wie eine Tapetenkante da; mit ihnen hat der
   * Raum eine Tiefe, die man nicht erklären muss.
   */
  const stumpen = [];
  for (let i = 0; i < 6; i++) {
    const cx = 70 + (i + rng() * 0.5) * ((w - 140) / 6);
    const fuss = wand + 10 + rng() * 22;
    const hoch = 30 + rng() * 48;
    const breit = 15 + rng() * 11;
    stumpen.push(smoothClosed([
      [cx - breit, fuss], [cx - breit * 0.3, fuss - hoch * 0.66],
      [cx, fuss - hoch], [cx + breit * 0.3, fuss - hoch * 0.66],
      [cx + breit, fuss],
    ], 2));
  }

  /**
   * Der Ausgang: ein heller Bogen unten in der Mitte.
   *
   * Die erste Fassung war ein kleiner weißer Hügel – im Bild ein
   * Sandhaufen, kein Weg nach draußen. Jetzt ist er hoch genug, dass man
   * eine Figur hindurchgehen sieht, und er hat zwei dunkle Felspfosten
   * daneben. Erst die machen aus einem hellen Fleck eine Öffnung.
   */
  const bogenH = 104;
  const bogen = [];
  /**
   * Ein Bogen, keine Zeltform.
   *
   * `sin(t*PI)` sieht nach einem Bogen aus, wenn man die Formel liest,
   * und ergibt gezeichnet eine Spitze: Die Kurve steigt an den Rändern
   * senkrecht an und läuft oben zusammen. Im Bild stand dort ein
   * weißes Zelt. Eine Ellipse tut, was gemeint war – flach oben,
   * senkrecht an den Seiten.
   */
  for (let i = 0; i <= 18; i++) {
    const winkel = Math.PI - (i / 18) * Math.PI;
    bogen.push([
      ausX + ausW / 2 + Math.cos(winkel) * (ausW / 2),
      h + 6 - Math.sin(winkel) * bogenH,
    ]);
  }
  const ausgang = smoothClosed(bogen.concat([[ausX + ausW, h + 8], [ausX, h + 8]]), 2);
  const pfostenL = smoothClosed([
    [ausX - 46, h], [ausX - 34, h - bogenH * 0.8],
    [ausX - 4, h - bogenH * 0.5], [ausX + 6, h],
  ], 2);
  const pfostenR = smoothClosed([
    [ausX + ausW - 6, h], [ausX + ausW + 4, h - bogenH * 0.5],
    [ausX + ausW + 34, h - bogenH * 0.8], [ausX + ausW + 46, h],
  ], 2);

  // Pfützen auf dem Boden: Sie sind der Grund, warum der Boden nicht flach
  // wirkt, und sie fangen das Licht vom Ausgang.
  const pfuetzen = [];
  for (let i = 0; i < 5; i++) {
    const cx = 80 + rng() * (w - 160);
    const cy = wand + 80 + rng() * (rh - 180);
    pfuetzen.push(smoothClosed(blob(cx, cy, 32 + rng() * 38, 12 + rng() * 11,
      seed + i * 17, 0.26, 14), 3));
  }

  const res = paintObject(w, h, {
    seed: seed,
    blur: 2.4,
    outline: 1.5,
    shadow: null,
    wash: function (g) {
      wash(g, bodenFlaeche, STEIN.boden, { seed: seed + 3, scale: 1.03 });
      wash(g, decke, STEIN.wand, { seed: seed + 1, scale: 1.04 });
      // Ganz oben am Bildrand am dunkelsten: Das Licht kommt von unten,
      // vom Ausgang – genau umgekehrt wie überall sonst im Spiel. Das ist
      // der Trick, der eine Höhle zur Höhle macht.
      wash(g, offsetShape(decke, 0, -wand * 0.55, 0.96), STEIN.wandTief,
        { seed: seed + 2, alpha: 0.7 });
      wash(g, offsetShape(decke, 0, wand * 0.42, 0.9), STEIN.wandLicht,
        { seed: seed + 5, alpha: 0.26 });
      // Der Boden wird nach hinten dunkler.
      wash(g, poly([[0, wand - 6], [w, wand - 6], [w, wand + 110], [0, wand + 110]], 2),
        STEIN.bodenTief, { seed: seed + 6, alpha: 0.5 });

      for (let i = 0; i < stumpen.length; i++) {
        wash(g, stumpen[i], STEIN.tropfstein, { seed: seed + 80 + i, alpha: 0.9 });
      }

      /**
       * Das Tageslicht aus dem Ausgang – als Verlauf, nicht als Fläche.
       *
       * Zuerst war das ein Trapez, dann drei gestapelte Trapeze. Beide
       * Male sah man im Bild genau das: ein Vieleck mit geraden Kanten,
       * das aussah wie ein Fehler in der Fläche und nicht wie Licht.
       *
       * Licht hat keine Kanten, also darf hier auch keine sein. Ein
       * runder Verlauf vom Ausgang her ist der einzige Weg dahin – die
       * gemalten Lasuren des Spiels können das nicht, weil sie immer
       * eine Form mit Rand sind. Das ist die eine Stelle im Bild, an der
       * nicht gemalt, sondern gerechnet wird, und sie ist es wert.
       */
      const lx = ausX + ausW / 2;
      const ly = h - 6;
      const schein = g.createRadialGradient(lx, ly, 18, lx, ly, rh * 0.95);
      schein.addColorStop(0, 'rgba(246,238,214,0.62)');
      schein.addColorStop(0.35, 'rgba(246,238,214,0.26)');
      schein.addColorStop(0.72, 'rgba(246,238,214,0.08)');
      schein.addColorStop(1, 'rgba(246,238,214,0)');
      g.save();
      g.fillStyle = schein;
      g.fillRect(0, wand - 10, w, rh + 20);
      g.restore();
      wash(g, pfostenL, STEIN.wandTief, { seed: seed + 96, alpha: 0.8 });
      wash(g, pfostenR, STEIN.wandTief, { seed: seed + 97, alpha: 0.8 });
      wash(g, ausgang, STEIN.tag, { seed: seed + 98, alpha: 0.95, scale: 1.01 });

      for (let i = 0; i < pfuetzen.length; i++) {
        wash(g, pfuetzen[i], STEIN.pfuetze, { seed: seed + 30 + i, alpha: 0.72 });
        wash(g, offsetShape(pfuetzen[i], -4, -3, 0.5), STEIN.pfuetzeLicht,
          { seed: seed + 40 + i, alpha: 0.5 });
      }
      for (let i = 0; i < zapfen.length; i++) {
        wash(g, zapfen[i], STEIN.tropfstein, { seed: seed + 50 + i, alpha: 0.78 });
        // Die Spitze heller – dort läuft das Wasser zusammen.
        wash(g, offsetShape(zapfen[i], 0, 14, 0.45), STEIN.wandLicht,
          { seed: seed + 56 + i, alpha: 0.4 });
      }
    },
    shape: function (g) {
      /**
       * Moos und Flechten an der Decke.
       *
       * In der ersten Fassung lagen sie bei halber Deckung über grauem
       * Stein – das Grün verschwand und übrig blieben graue Klumpen in
       * einer Reihe. Jetzt decken sie voll, hängen in Büscheln am Rand
       * der Decke und sind die einzige warme Farbe im Bild. Ohne sie ist
       * es grau in grau, und grau in grau ist keine Farbe, sondern ein
       * fehlendes Bild.
       */
      // In Büscheln, nicht einzeln verstreut: Drei, vier Tupfen dicht
      // beieinander lesen sich als Moospolster, derselbe Tupfen allein
      // als Fleck. Einzeln verstreut sahen sie aus wie Schmutz.
      // Über die Breite verteilt, nicht frei gewürfelt: Sieben freie
      // Würfe landeten alle in derselben Bildhälfte, und die andere war
      // kahl. Jedes Büschel bekommt deshalb sein Siebtel.
      for (let i = 0; i < 7; i++) {
        const bx = 40 + (i + rng() * 0.7) * ((w - 80) / 7);
        const by = wand - 26 - rng() * 44;
        for (let k = 0; k < 3 + Math.floor(rng() * 3); k++) {
          g.fillStyle = k % 2 ? STEIN.flechteHell : STEIN.flechte;
          g.globalAlpha = 0.78 + rng() * 0.22;
          fill(g, smoothClosed(blob(bx + (rng() - 0.5) * 46, by + (rng() - 0.5) * 26,
            6 + rng() * 9, 4 + rng() * 6, seed + 200 + i * 7 + k, 0.34, 9), 3));
        }
      }
      g.globalAlpha = 1;
      // Geröll auf dem Boden – kleine dunkle Brocken, damit der Boden
      // nicht wie gegossen aussieht.
      g.fillStyle = STEIN.bodenTief;
      for (let i = 0; i < 18; i++) {
        const x = 30 + rng() * (w - 60);
        const y = wand + 40 + rng() * (rh - 70);
        g.globalAlpha = 0.3 + rng() * 0.25;
        fill(g, smoothClosed(blob(x, y, 5 + rng() * 10, 3 + rng() * 6,
          seed + 250 + i, 0.3, 8), 3));
      }
      g.globalAlpha = 1;
    },
    detail: function (g) {
      // Funkeln in der Decke: der Hinweis darauf, dass hier etwas zu holen
      // ist. Sparsam – drei Dutzend Glitzerpunkte wären ein Discoball.
      for (let i = 0; i < 9; i++) {
        const x = 40 + rng() * (w - 80);
        const y = 20 + rng() * (wand - 60);
        dot(g, null, x, y, 2.4 + rng() * 2, STEIN.funkel, seed + 300 + i);
      }
      /**
       * Risse im Boden – in Steinfarbe, nicht in Tusche.
       *
       * `inkLine` setzt seine Farbe SELBST und überschreibt dabei
       * `strokeStyle`; ohne `color` zeichnet es tiefschwarz. Das war hier
       * zuerst der Fall, und im Bild lagen tiefschwarze Striche auf dem
       * hellen Höhlenboden, die aussahen wie Kratzer auf der Linse.
       * Dieselbe Falle gilt für jeden anderen `inkLine`-Aufruf in dieser
       * Datei.
       */
      for (let i = 0; i < 6; i++) {
        const x = 60 + rng() * (w - 120);
        const y = wand + 70 + rng() * (rh - 150);
        inkLine(g, x, y, x + (rng() - 0.5) * 110, y + (rng() - 0.5) * 44,
          { bend: 0.3, seed: seed + 400 + i, color: STEIN.bodenTief,
            alpha: 0.32, width: 1.6 });
      }
    },
    ink: function (g) {
      // Die Deckenkante als eigener Strich – OFFEN gezeichnet, nicht als
      // geschlossene Form: Eine Kontur um die ganze Deckenfläche hätte
      // einen Rahmen am Bildrand ergeben, und ein Rahmen macht aus dem
      // Raum wieder ein Bild von einem Raum.
      inkStroke(g, smoothClosed(kante, 2), {
        closed: false, width: 2.6, seed: seed + 11, vary: 0.6,
      });
      for (let i = 0; i < zapfen.length; i++) {
        inkStroke(g, zapfen[i], { width: 1.9, seed: seed + 60 + i, vary: 0.5 });
      }
      for (let i = 0; i < stumpen.length; i++) {
        inkStroke(g, stumpen[i], { width: 1.9, seed: seed + 85 + i, vary: 0.5 });
      }
      for (let i = 0; i < pfuetzen.length; i++) {
        inkStroke(g, pfuetzen[i], { width: 1.5, seed: seed + 70 + i, vary: 0.6 });
      }
      inkStroke(g, pfostenL, { width: 2.2, seed: seed + 115, vary: 0.5 });
      inkStroke(g, pfostenR, { width: 2.2, seed: seed + 116, vary: 0.5 });
      inkStroke(g, ausgang, { width: 2.6, seed: seed + 12, vary: 0.4 });
    },
  });
  return made(res, w, h, 0, 0);
}

/** Die Mühle von innen: Bretter, Mehl und ein Mahlwerk. */
const MUEHLE = {
  wand: '#c3a173',
  holz: '#c49a66',
  holzTief: '#9a7342',
  balkenTief: '#6d5233',
  steinLicht: '#d6d0c0',
  eisen: '#8d949b',
  tuerLicht: '#e7d7b2',
  wandTief: '#9a7a50',
  wandLicht: '#dcc096',
  boden: '#d6bb8e',
  bodenTief: '#ad8d60',
  balken: '#8e6d45',
  stein: '#b9b3a4',
  steinTief: '#8d887b',
  mehl: '#f7f1df',
  fenster: '#dceaee',
  fensterTief: '#aac6cf',
  sack: '#e0d2ad',
  sackTief: '#bda97f',
};

/**
 * Den Mahlboden malen.
 *
 * Das Mahlwerk steht links an der Wand und ist absichtlich groß: Es ist der
 * Grund, hier zu sein, und ein Mühlstein, den man suchen muss, erzählt
 * nichts. Rechts das Fenster, durch das ein Flügel vorbeizieht – das ist
 * der einzige Hinweis darauf, dass man in einem Turm steht und nicht in
 * einem Schuppen.
 */
export function paintMuehleInnen(opts) {
  const o = opts || {};
  const rw = o.w || 720;
  const rh = o.h || 440;
  const wand = o.wand || 185;
  const seed = o.seed || 5200;
  const ausX = o.ausgang ? o.ausgang.x : rw / 2 - 55;
  const ausW = o.ausgang ? o.ausgang.w : 110;
  const w = rw;
  const h = wand + rh;
  const rng = makeRng(seed);

  const wandFlaeche = poly([[0, 0], [w, 0], [w, wand], [0, wand]], 2);
  const bodenFlaeche = poly([[0, wand], [w, wand], [w, h], [0, h]], 2);

  /**
   * Die Tür muss man SEHEN.
   *
   * In der ersten Fassung war sie ein 26 Punkt hoher Streifen am
   * untersten Bildrand – im Bild nicht vorhanden, weil dort die
   * Werkzeugleiste liegt. Jetzt ist sie ein richtiger Türrahmen mit
   * Sturz und hellem Spalt: der einzige Ausgang, und er darf nicht
   * geraten werden müssen.
   */
  const tuerH = 118;
  const tuer = poly([
    [ausX, h - tuerH], [ausX + ausW, h - tuerH], [ausX + ausW, h], [ausX, h],
  ], 2);
  const sturz = poly([
    [ausX - 16, h - tuerH - 16], [ausX + ausW + 16, h - tuerH - 16],
    [ausX + ausW + 16, h - tuerH], [ausX - 16, h - tuerH],
  ], 2);

  // Das Fenster rechts, rund – ein Turmfenster, kein Hausfenster.
  const fx = w - 142;
  const fy = 52;
  const fenster = smoothClosed(blob(fx, fy + 42, 56, 54, seed + 9, 0.05, 22), 3);

  /**
   * Das Mahlwerk – der Grund, hier zu sein.
   *
   * Die erste Fassung waren zwei flache Scheiben übereinander. Im Bild
   * war das eine graue Schüssel, und niemand hätte darin eine Mühle
   * erkannt. Ein Mühlstein sieht von der Seite nicht rund aus, sondern
   * wie ein dicker Zylinder: Deckfläche als Ellipse, darunter eine
   * gerade Kante von Handbreit Höhe. Dazu gehören drei Dinge, ohne die
   * es kein Mahlwerk ist – der Bottich, auf dem er steht, der Trichter
   * darüber, in den das Korn kommt, und die Welle, die beides verbindet.
   */
  const mx = 176;
  const mBoden = wand + 238;
  const steinH = 46;
  const steinR = 104;
  const steinRy = 36;
  // Der Bottich: ein Fass aus Brettern, auf dem der Stein liegt.
  const bottich = poly([
    [mx - steinR - 6, mBoden - 84], [mx + steinR + 6, mBoden - 84],
    [mx + steinR - 10, mBoden], [mx - steinR + 10, mBoden],
  ], 2);
  // Die Seitenwand des Steins.
  const steinKante = poly([
    [mx - steinR, mBoden - 84 - steinH], [mx + steinR, mBoden - 84 - steinH],
    [mx + steinR, mBoden - 84], [mx - steinR, mBoden - 84],
  ], 2);
  // Die Deckfläche.
  const steinDeck = smoothClosed(
    blob(mx, mBoden - 84 - steinH, steinR, steinRy, seed + 21, 0.04, 24), 3);
  // Der Trichter darüber: oben weit, unten eng.
  const trichterOben = wand + 24;
  const trichterUnten = mBoden - 84 - steinH - 26;
  const trichter = poly([
    [mx - 76, trichterOben], [mx + 76, trichterOben],
    [mx + 26, trichterUnten], [mx - 26, trichterUnten],
  ], 2);

  // Die Säcke rechts hinten – unterschiedlich prall, sonst sind es Eier.
  const saecke = [];
  for (let i = 0; i < 3; i++) {
    const sx = w - 246 + i * 82 + rng() * 10;
    const sy = wand + 112 + (i % 2) * 44;
    const b = 36 + rng() * 10;
    saecke.push(smoothClosed([
      [sx - b, sy + 52], [sx - b + 4, sy - 10], [sx - 14, sy - 36],
      [sx - 2, sy - 44], [sx + 14, sy - 34], [sx + b - 6, sy - 8],
      [sx + b, sy + 52],
    ], 3));
  }

  const res = paintObject(w, h, {
    seed: seed,
    blur: 2.2,
    outline: 1.5,
    shadow: null,
    wash: function (g) {
      wash(g, wandFlaeche, MUEHLE.wand, { seed: seed + 1, scale: 1.05 });
      wash(g, offsetShape(wandFlaeche, 0, wand * 0.44, 0.9), MUEHLE.wandTief,
        { seed: seed + 2, alpha: 0.46 });
      wash(g, bodenFlaeche, MUEHLE.boden, { seed: seed + 3, scale: 1.04 });
      wash(g, poly([[0, wand], [w, wand], [w, wand + 36], [0, wand + 36]], 2),
        MUEHLE.bodenTief, { seed: seed + 4, alpha: 0.42 });

      wash(g, fenster, MUEHLE.fenster, { seed: seed + 10, scale: 1.03 });
      wash(g, offsetShape(fenster, 0, 16, 0.6), MUEHLE.fensterTief,
        { seed: seed + 11, alpha: 0.5 });
      // Der Lichtfleck, den das Fenster auf die Dielen wirft – schräg,
      // weil das Fenster rechts oben sitzt. Ein senkrechter Fleck hätte
      // ausgesehen, als käme das Licht von der Decke.
      wash(g, smoothClosed([
        [fx - 54, wand + 14], [fx + 62, wand + 6],
        [fx + 96, wand + 172], [fx - 108, wand + 186],
      ], 3), MUEHLE.mehl, { seed: seed + 12, alpha: 0.3 });

      wash(g, trichter, MUEHLE.holz, { seed: seed + 18, scale: 1.02 });
      wash(g, offsetShape(trichter, 22, 0, 0.5), MUEHLE.holzTief,
        { seed: seed + 19, alpha: 0.4 });
      wash(g, bottich, MUEHLE.holz, { seed: seed + 24, scale: 1.02 });
      wash(g, offsetShape(bottich, 26, 10, 0.55), MUEHLE.holzTief,
        { seed: seed + 25, alpha: 0.45 });
      wash(g, steinKante, MUEHLE.steinTief, { seed: seed + 22, scale: 1.01 });
      wash(g, steinDeck, MUEHLE.stein, { seed: seed + 23, scale: 1.02 });
      // Der Lichtrand auf der Deckfläche – ohne ihn ist der Stein ein Loch.
      wash(g, offsetShape(steinDeck, -14, -8, 0.6), MUEHLE.steinLicht,
        { seed: seed + 26, alpha: 0.5 });

      for (let i = 0; i < saecke.length; i++) {
        wash(g, saecke[i], MUEHLE.sack, { seed: seed + 30 + i, scale: 1.03 });
        wash(g, offsetShape(saecke[i], 12, 14, 0.6), MUEHLE.sackTief,
          { seed: seed + 35 + i, alpha: 0.45 });
      }
      wash(g, sturz, MUEHLE.balken, { seed: seed + 41, alpha: 0.85 });
      wash(g, tuer, MUEHLE.tuerLicht, { seed: seed + 40, alpha: 0.8 });

      // Mehlstaub auf den Dielen rings um den Stein. Er ist das, was den
      // Raum benutzt aussehen lässt – ein sauberer Mahlboden wäre ein Modell.
      for (let i = 0; i < 8; i++) {
        const x = mx + (rng() - 0.5) * 320;
        const y = mBoden - 30 + rng() * 120;
        wash(g, smoothClosed(blob(x, y, 32 + rng() * 46, 13 + rng() * 16,
          seed + 60 + i, 0.3, 14), 3), MUEHLE.mehl,
        { seed: seed + 70 + i, alpha: 0.42 });
      }
    },
    shape: function (g) {
      /**
       * Die Balken an der Wand – BREIT, nicht als Linie.
       *
       * Zuerst waren es Striche von sieben Punkten Breite. Im Bild sah
       * das aus wie vier lange Haare an einer Tapete. Ein Balken ist
       * eine Fläche mit zwei Kanten, und erst dadurch steht die Wand.
       */
      for (let i = 1; i < 5; i++) {
        const x = (w * i) / 5 + (rng() - 0.5) * 10;
        const b = 13 + rng() * 5;
        const balken = poly([[x - b, -4], [x + b, -4], [x + b, wand], [x - b, wand]], 2);
        wash(g, balken, MUEHLE.balken, { seed: seed + 90 + i, alpha: 0.72 });
        wash(g, offsetShape(balken, b * 0.7, 0, 0.5), MUEHLE.balkenTief,
          { seed: seed + 95 + i, alpha: 0.4 });
      }
      // Die Dielen: nur ein paar Fugen, und sie laufen quer. Sieben
      // durchgehende Linien über die ganze Breite sahen aus wie eine
      // Leiter, die jemand hingelegt hat.
      // Kurze Stücke, nicht durchgehend: Vier Linien über die ganze
      // Breite liefen im Bild quer durch Mühlstein und Säcke hindurch
      // und sahen aus wie gespannte Drähte. Eine Fuge, die man hinter
      // einem Sack weiterlaufen sieht, ist schlimmer als gar keine.
      for (let i = 1; i < 5; i++) {
        const y = wand + (rh * i) / 5;
        const x0 = 40 + rng() * (w * 0.3);
        const laenge = 120 + rng() * 180;
        inkLine(g, x0, y, x0 + laenge, y + (rng() - 0.5) * 6,
          { bend: 0.02, seed: seed + 80 + i, color: MUEHLE.bodenTief,
            alpha: 0.26, width: 1.6 });
      }
    },
    detail: function (g) {
      // Die Welle vom Trichter hinauf in die Decke: Sie verbindet
      // drinnen und draußen – oben drehen sich die Flügel.
      inkLine(g, mx, wand + 30, mx - 8, -6,
        { bend: 0.015, seed: seed + 100, color: MUEHLE.balken, width: 13 });
      // Die Reifen um den Bottich.
      // Nur so breit wie der Bottich an dieser Höhe. Mit der vollen
      // Steinbreite standen sie links und rechts über das Fass hinaus
      // in der Luft.
      for (let i = 0; i < 2; i++) {
        const t = 0.25 + i * 0.45;
        const y = mBoden - 84 + t * 84;
        const halb = (steinR + 6) - t * 16;
        inkLine(g, mx - halb, y, mx + halb, y - 2,
          { bend: 0.03, seed: seed + 104 + i, color: MUEHLE.eisen, width: 5 });
      }
      // Das Kreuz im Fenster.
      inkLine(g, fx - 52, fy + 42, fx + 52, fy + 42,
        { bend: 0.04, seed: seed + 101, color: MUEHLE.balken, width: 5 });
      inkLine(g, fx, fy - 8, fx, fy + 92,
        { bend: 0.04, seed: seed + 102, color: MUEHLE.balken, width: 5 });
      // Die Bretter der Tür.
      for (let i = 1; i < 4; i++) {
        const x = ausX + (ausW * i) / 4;
        inkLine(g, x, h - tuerH + 8, x, h - 6,
          { bend: 0.01, seed: seed + 140 + i, color: MUEHLE.balkenTief, width: 3 });
      }
    },
    ink: function (g) {
      inkLine(g, 0, wand, w, wand, { bend: 0.012, seed: seed + 110, width: 2.4 });
      inkStroke(g, fenster, { width: 2.4, seed: seed + 111, vary: 0.4 });
      inkStroke(g, trichter, { width: 2.2, seed: seed + 117, vary: 0.4 });
      inkStroke(g, bottich, { width: 2.2, seed: seed + 118, vary: 0.4 });
      inkStroke(g, steinKante, { width: 2.2, seed: seed + 112, vary: 0.4 });
      inkStroke(g, steinDeck, { width: 2.6, seed: seed + 113, vary: 0.4 });
      for (let i = 0; i < saecke.length; i++) {
        inkStroke(g, saecke[i], { width: 2, seed: seed + 120 + i, vary: 0.5 });
      }
      inkStroke(g, sturz, { width: 2.2, seed: seed + 131, vary: 0.4 });
      inkStroke(g, tuer, { width: 2.4, seed: seed + 130, vary: 0.4 });
    },
  });
  return made(res, w, h, 0, 0);
}

/**
 * Der Höhleneingang, von außen gesehen.
 *
 * Ein Felsvorsprung mit einem dunklen Loch darin. Das Loch ist das Ganze:
 * Es muss schwarz genug sein, dass man von weitem sieht, dass es dort
 * weitergeht – ein halbdunkler Fleck sähe aus wie ein Schatten am Hang.
 *
 * Der Fels ringsum ist kein Schmuck, sondern die Erklärung für das Loch.
 * Ohne ihn läge auf der Wiese ein schwarzer Fleck.
 */
export function paintHoehleEingang(opts) {
  const o = opts || {};
  const seed = o.seed || 6100;
  const w = 164;
  const h = 132;
  const rng = makeRng(seed);

  const fels = smoothClosed([
    [8, h - 4], [12, h - 54], [34, h - 92], [70, h - 112],
    [104, h - 106], [136, h - 78], [152, h - 34], [156, h - 4],
  ], 3);
  // Das Loch: unten breit, oben gerundet – eine Öffnung, durch die man
  // gebückt hineingeht, kein Mauseloch und kein Tor.
  const loch = [];
  for (let i = 0; i <= 16; i++) {
    const winkel = Math.PI - (i / 16) * Math.PI;
    loch.push([
      w / 2 + Math.cos(winkel) * 38,
      h - 6 - Math.sin(winkel) * 62,
    ]);
  }
  const oeffnung = smoothClosed(loch.concat([[w / 2 + 38, h - 4], [w / 2 - 38, h - 4]]), 2);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 2,
    outline: 1.4,
    shadow: function (g) { groundShadow(g, w / 2, h - 6, 72, 15, seed, 0.2); },
    wash: function (g) {
      wash(g, fels, ink.rock, { seed: seed + 1, scale: 1.03 });
      wash(g, offsetShape(fels, 14, 16, 0.72), ink.rockShade,
        { seed: seed + 2, alpha: 0.55 });
      wash(g, offsetShape(fels, -16, -12, 0.5), '#eceadd',
        { seed: seed + 3, alpha: 0.4 });
      // Zweimal dunkel übereinander: Eine Lasur allein bleibt durchsichtig,
      // und durch ein Loch im Berg sieht man nun einmal nichts.
      wash(g, oeffnung, '#3a352f', { seed: seed + 4, alpha: 0.95, scale: 1.02 });
      wash(g, offsetShape(oeffnung, 0, 10, 0.86), '#211e1a',
        { seed: seed + 5, alpha: 0.9 });
      // Gras am Fuß – es setzt den Fels auf den Boden.
      for (let i = 0; i < 5; i++) {
        const x = 16 + rng() * (w - 32);
        wash(g, smoothClosed(blob(x, h - 8, 16 + rng() * 14, 7 + rng() * 5,
          seed + 20 + i, 0.3, 10), 3), ink.grassDark,
        { seed: seed + 30 + i, alpha: 0.55 });
      }
    },
    detail: function (g) {
      // Risse im Fels.
      inkLine(g, 36, h - 84, 58, h - 40,
        { bend: 0.25, seed: seed + 40, color: ink.rockDeep, alpha: 0.45, width: 1.8 });
      inkLine(g, 124, h - 70, 110, h - 26,
        { bend: 0.2, seed: seed + 41, color: ink.rockDeep, alpha: 0.45, width: 1.8 });
    },
    ink: function (g) {
      inkStroke(g, fels, { width: 2.4, seed: seed + 50, vary: 0.5 });
      inkStroke(g, oeffnung, { width: 2.6, seed: seed + 51, vary: 0.4 });
    },
  });
  return made(res, w, h, w / 2, h - 4);
}

/**
 * Die Tür an der Mühle.
 *
 * Klein, schlicht und bewusst fast nur Umriss: Sie steht vor dem gemalten
 * Mühlenturm und darf ihn nicht überdecken. Was sie leisten muss, ist
 * einzig, dass man sie als Tür erkennt und nicht als Brett.
 */
export function paintMuehleTuer(opts) {
  const o = opts || {};
  const seed = o.seed || 6200;
  const w = 76;
  const h = 104;
  const rahmen = poly([[8, h - 4], [8, 22], [38, 6], [68, 22], [68, h - 4]], 2);
  const blatt = poly([[16, h - 6], [16, 28], [38, 15], [60, 28], [60, h - 6]], 2);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.8,
    outline: 1.4,
    shadow: function (g) { groundShadow(g, w / 2, h - 6, 32, 9, seed, 0.2); },
    wash: function (g) {
      wash(g, rahmen, MUEHLE.balken, { seed: seed + 1, scale: 1.03 });
      wash(g, blatt, MUEHLE.holz, { seed: seed + 2, scale: 1.02 });
      wash(g, offsetShape(blatt, 10, 8, 0.6), MUEHLE.holzTief,
        { seed: seed + 3, alpha: 0.4 });
    },
    detail: function (g) {
      for (let i = 1; i < 3; i++) {
        const x = 16 + (44 * i) / 3;
        inkLine(g, x, 24, x, h - 10,
          { bend: 0.01, seed: seed + 10 + i, color: MUEHLE.balkenTief, width: 2.4 });
      }
      // Der Griff – ohne ihn ist es ein Brett.
      dot(g, null, 52, h - 46, 4, MUEHLE.eisen, seed + 20);
    },
    ink: function (g) {
      inkStroke(g, rahmen, { width: 2.2, seed: seed + 30, vary: 0.4 });
      inkStroke(g, blatt, { width: 2, seed: seed + 31, vary: 0.4 });
    },
  });
  return made(res, w, h, w / 2, h - 4);
}

/**
 * Die Kristallader – der Grund, eine Höhle überhaupt zu betreten.
 *
 * Ein Felsklotz, aus dem Kristalle wachsen. Die Kristalle müssen die
 * Hauptsache sein, nicht der Stein: Aus zwei Schritten Entfernung soll man
 * sehen, dass hier etwas anderes liegt als der graue Brocken daneben.
 * Deshalb sind sie groß, hell und kühl gegen den warmen Höhlenboden.
 */
export function paintKristallader(opts) {
  const o = opts || {};
  const seed = o.seed || 6300;
  const w = 96;
  const h = 92;
  const rng = makeRng(seed);
  const basis = smoothClosed(blob(w / 2, h - 18, 40, 20, seed + 1, 0.22, 14), 3);

  // Drei Kristalle verschiedener Länge, leicht gefächert. Gleich lange
  // Kristalle sehen aus wie eine Gabel.
  const spitzen = [];
  const winkel = [-0.42, -0.04, 0.38];
  for (let i = 0; i < 3; i++) {
    const fx = w / 2 + (i - 1) * 19 + (rng() - 0.5) * 5;
    const fy = h - 24;
    const lang = 34 + (i === 1 ? 20 : 0) + rng() * 10;
    const br = 9 + rng() * 4;
    const a = winkel[i];
    const sx = fx + Math.sin(a) * lang;
    const sy = fy - Math.cos(a) * lang;
    spitzen.push([
      [fx - br, fy], [fx + br, fy],
      [sx + br * 0.3, sy + lang * 0.2], [sx, sy], [sx - br * 0.3, sy + lang * 0.2],
    ]);
  }

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.8,
    outline: 1.4,
    shadow: function (g) { groundShadow(g, w / 2, h - 10, 40, 11, seed, 0.22); },
    wash: function (g) {
      wash(g, basis, ink.rock, { seed: seed + 2, scale: 1.03 });
      wash(g, offsetShape(basis, 8, 6, 0.7), ink.rockShade, { seed: seed + 3, alpha: 0.5 });
      for (let i = 0; i < spitzen.length; i++) {
        const k = smoothClosed(spitzen[i], 2);
        wash(g, k, STEIN.funkel, { seed: seed + 10 + i, scale: 1.02 });
        // Die Lichtkante an der linken Flanke: Ohne sie ist ein Kristall
        // eine blaue Fläche, mit ihr ist er durchsichtig.
        wash(g, offsetShape(k, -4, -6, 0.44), '#f2fbfb',
          { seed: seed + 16 + i, alpha: 0.72 });
        wash(g, offsetShape(k, 5, 8, 0.4), '#7fb6c4',
          { seed: seed + 22 + i, alpha: 0.5 });
      }
    },
    ink: function (g) {
      inkStroke(g, basis, { width: 2.2, seed: seed + 30, vary: 0.5 });
      for (let i = 0; i < spitzen.length; i++) {
        inkStroke(g, smoothClosed(spitzen[i], 2),
          { width: 2.1, seed: seed + 40 + i, vary: 0.35 });
      }
    },
  });
  return made(res, w, h, w / 2, h - 8);
}

/** Leuchtmoos: ein Polster, das von innen glimmt. */
export function paintLeuchtmoos(opts) {
  const o = opts || {};
  const seed = o.seed || 6400;
  const w = 64;
  const h = 44;
  const rng = makeRng(seed);
  const polster = [];
  for (let i = 0; i < 5; i++) {
    polster.push(smoothClosed(blob(
      14 + rng() * (w - 28), h - 12 - rng() * 14,
      9 + rng() * 8, 6 + rng() * 5, seed + i * 13, 0.3, 11), 3));
  }
  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.6,
    outline: 1.2,
    shadow: function (g) { groundShadow(g, w / 2, h - 7, 22, 7, seed, 0.14); },
    wash: function (g) {
      for (let i = 0; i < polster.length; i++) {
        wash(g, polster[i], i % 2 ? '#9fd59a' : '#7dbd8d',
          { seed: seed + 20 + i, scale: 1.04 });
        // Der Glimmkern – heller als das Moos selbst, sonst leuchtet
        // nichts, sondern es ist nur grün.
        wash(g, offsetShape(polster[i], 0, -2, 0.42), '#e6f7c8',
          { seed: seed + 30 + i, alpha: 0.8 });
      }
    },
    detail: function (g) {
      for (let i = 0; i < 6; i++) {
        dot(g, null, 12 + rng() * (w - 24), h - 14 - rng() * 14,
          1.8 + rng() * 1.6, '#f4ffe0', seed + 40 + i);
      }
    },
    ink: function (g) {
      for (let i = 0; i < polster.length; i++) {
        inkStroke(g, polster[i], { width: 1.5, seed: seed + 50 + i, vary: 0.6 });
      }
    },
  });
  return made(res, w, h, w / 2, h - 6);
}

/** Der Mehlsack: offen, mit Mehl obenauf. */
export function paintMehlsack(opts) {
  const o = opts || {};
  const seed = o.seed || 6500;
  const w = 72;
  const h = 86;
  const sack = smoothClosed([
    [14, h - 6], [12, h - 42], [20, h - 62], [34, h - 70],
    [50, h - 64], [58, h - 44], [60, h - 6],
  ], 3);
  const mehl = smoothClosed(blob(36, h - 66, 20, 9, seed + 2, 0.24, 12), 3);
  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.8,
    outline: 1.3,
    shadow: function (g) { groundShadow(g, w / 2, h - 8, 28, 9, seed, 0.2); },
    wash: function (g) {
      wash(g, sack, MUEHLE.sack, { seed: seed + 3, scale: 1.03 });
      wash(g, offsetShape(sack, 12, 10, 0.6), MUEHLE.sackTief,
        { seed: seed + 4, alpha: 0.45 });
      wash(g, mehl, MUEHLE.mehl, { seed: seed + 5, scale: 1.03 });
    },
    detail: function (g) {
      // Die Schnur um den Hals – sie macht aus einem Beutel einen Sack.
      inkLine(g, 18, h - 52, 56, h - 54,
        { bend: 0.08, seed: seed + 10, color: MUEHLE.balkenTief, width: 3 });
    },
    ink: function (g) {
      inkStroke(g, sack, { width: 2, seed: seed + 20, vary: 0.5 });
      inkStroke(g, mehl, { width: 1.6, seed: seed + 21, vary: 0.5 });
    },
  });
  return made(res, w, h, w / 2, h - 6);
}
