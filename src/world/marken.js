/**
 * Wo die Landmarken stehen.
 *
 * Jede genau einmal je Insel, jede dort, wo sie hingehört: das Wrack am
 * Strand, der Steinkreis auf der offenen Heide, der Leuchtturm auf dem
 * Fels am Wasser. Eine Marke an der falschen Stelle ist schlimmer als
 * keine – ein Leuchtturm mitten im Wald ist kein Wahrzeichen, sondern
 * ein Fehler.
 *
 * Die Stelle wird GESUCHT und nicht gesetzt: Jede Insel sieht anders
 * aus, und eine Kachelkoordinate, die auf einer Insel am Strand liegt,
 * liegt auf der nächsten im Meer. Gesucht wird die Stelle, die am besten
 * passt, und „am besten" ist für jede Marke etwas anderes.
 */
import { T, TILE_SIZE, isWalkable, isWater } from '../art/tiles.js';
import { MAP_W, MAP_H, tileIndex, regionAt, REGION } from './worldgen.js';
import { BIOM } from './biome.js';

/**
 * Die sieben Marken – in der Reihenfolge, in der nach ihnen gesucht wird.
 *
 * Die Reihenfolge ist der entscheidende Teil: Wer zuletzt sucht, findet
 * nur noch, was übrig ist. Zuerst kommt deshalb, was die engsten
 * Bedingungen hat. Der Leuchtturm braucht Fels am Wasser an den Klippen –
 * davon gibt es auf einer Insel rund zweihundert Kacheln, und als er an
 * fünfter Stelle stand, lagen ALLE zweihundert zu nah an einer schon
 * gesetzten Marke. Auf vier von acht Inseln fehlte er dadurch ganz.
 *
 *   sprite   die Grafik
 *   block    halbe Breite in Weltpunkten, für die Kollision
 *   frei     wie viel Platz ringsum gebraucht wird (Weltpunkte)
 *   passt    ob eine Kachel in Frage kommt
 *   gut      wie gut sie ist – größer ist besser, entscheidet die Wahl
 */
/**
 * Wie weit zwei Marken mindestens auseinanderstehen, in Kacheln.
 *
 * Einundzwanzig sind gut ein Bildschirm: weit genug, dass man die eine
 * verlässt, bevor man die andere sieht. Mehr geht nicht – mit
 * vierundzwanzig fand der hohle Baum auf drei von sechs Inseln keinen
 * Platz mehr, und eine Marke, die es manchmal nicht gibt, ist kein
 * Wahrzeichen.
 */
const MIN_ABSTAND = 21;

/** Der Notabstand, wenn sich mit dem vollen keiner findet. */
const NOT_ABSTAND = 15;

export const MARKEN = [
  {
    id: 'leuchtturm',
    name: 'der Leuchtturm',
    sprite: 'marke_leuchtturm',
    block: 60,
    frei: 120,
    // Ein Leuchtturm steht auf einer Landspitze – dort ist der Kranz um
    // ihn herum naturgemäß zur Hälfte Wasser. Mit der allgemeinen Regel
    // (die Hälfte muss begehbar sein) fand er auf vier von sechs Inseln
    // keinen Platz. Um einen Leuchtturm geht man nicht herum, man geht
    // zu ihm hin.
    kranz: 0.28,
    passt: function (w, tx, ty) {
      const t = w.tileAtTile(tx, ty);
      return (t === T.ROCKFLOOR || t === T.GRASS) && amWasser(w, tx, ty, 4)
        && regionAt(tx, ty) === REGION.CLIFFS;
    },
    // Möglichst weit draußen auf der Landzunge.
    gut: function (w, tx, ty) { return wasserAnteil(w, tx, ty, 5); },
  },
  {
    id: 'wrack',
    name: 'das Wrack',
    sprite: 'marke_wrack',
    block: 120,
    frei: 150,
    passt: function (w, tx, ty) {
      return w.tileAtTile(tx, ty) === T.SAND && amWasser(w, tx, ty, 3);
    },
    // Je mehr Wasser ringsum, desto mehr sieht es nach gestrandet aus.
    gut: function (w, tx, ty) { return wasserAnteil(w, tx, ty, 4); },
  },
  {
    id: 'steinkreis',
    name: 'der Steinkreis',
    sprite: 'marke_steinkreis',
    block: 100,
    frei: 170,
    passt: function (w, tx, ty) {
      return w.tileAtTile(tx, ty) === T.GRASS && w.biomAtTile(tx, ty) === BIOM.HEIDE;
    },
    // Auf der Heide, und zwar mitten darauf: Ein Steinkreis am Waldrand
    // ist versteckt, und eine Marke, die man nicht sieht, ist keine.
    gut: function (w, tx, ty) { return biomAnteil(w, tx, ty, 5, BIOM.HEIDE); },
  },
  {
    id: 'gerippe',
    name: 'das Gerippe',
    sprite: 'marke_gerippe',
    block: 92,
    frei: 120,
    passt: function (w, tx, ty) {
      return w.tileAtTile(tx, ty) === T.SAND;
    },
    // Weit weg vom Wrack: Zwei Marken nebeneinander sind eine Marke.
    gut: function (w, tx, ty, gesetzt) { return abstandZu(gesetzt, tx, ty); },
  },
  {
    id: 'torbogen',
    name: 'der Torbogen',
    sprite: 'marke_torbogen',
    block: 82,
    frei: 130,
    passt: function (w, tx, ty) {
      const b = w.biomAtTile(tx, ty);
      return w.tileAtTile(tx, ty) === T.GRASS
        && (b === BIOM.BLUMENWIESE || b === BIOM.WIESE);
    },
    gut: function (w, tx, ty, gesetzt) { return abstandZu(gesetzt, tx, ty); },
  },
  {
    id: 'baum',
    name: 'der hohle Baum',
    sprite: 'marke_baum',
    block: 88,
    frei: 140,
    passt: function (w, tx, ty) {
      return w.tileAtTile(tx, ty) === T.GRASS && w.biomAtTile(tx, ty) === BIOM.NADELWALD;
    },
    gut: function (w, tx, ty) { return biomAnteil(w, tx, ty, 5, BIOM.NADELWALD); },
  },
  {
    id: 'muehle',
    name: 'die alte Mühle',
    sprite: 'marke_muehle',
    block: 86,
    frei: 150,
    passt: function (w, tx, ty) {
      const b = w.biomAtTile(tx, ty);
      return w.tileAtTile(tx, ty) === T.GRASS
        && (b === BIOM.WIESE || b === BIOM.BLUMENWIESE);
    },
    gut: function (w, tx, ty, gesetzt) { return abstandZu(gesetzt, tx, ty); },
  },
];

function amWasser(w, tx, ty, r) {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (isWater(w.tileAtTile(tx + dx, ty + dy))) return true;
    }
  }
  return false;
}

function wasserAnteil(w, tx, ty, r) {
  let n = 0;
  let k = 0;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      k++;
      if (isWater(w.tileAtTile(tx + dx, ty + dy))) n++;
    }
  }
  return k ? n / k : 0;
}

function biomAnteil(w, tx, ty, r, biom) {
  let n = 0;
  let k = 0;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      k++;
      if (w.biomAtTile(tx + dx, ty + dy) === biom) n++;
    }
  }
  return k ? n / k : 0;
}

/** Steht schon eine Marke näher als `min` Kacheln? */
function zuNah(gesetzt, tx, ty, min) {
  for (let i = 0; i < gesetzt.length; i++) {
    const dx = gesetzt[i][0] - tx;
    const dy = gesetzt[i][1] - ty;
    if (dx * dx + dy * dy < min * min) return true;
  }
  return false;
}

/** Abstand zur nächsten schon gesetzten Marke, auf 0..1 gedeckelt. */
function abstandZu(gesetzt, tx, ty) {
  if (!gesetzt || !gesetzt.length) return 1;
  let nah = 1e9;
  for (let i = 0; i < gesetzt.length; i++) {
    const dx = gesetzt[i][0] - tx;
    const dy = gesetzt[i][1] - ty;
    nah = Math.min(nah, dx * dx + dy * dy);
  }
  return Math.min(1, Math.sqrt(nah) / 40);
}

/**
 * Die Plätze aller Marken suchen.
 *
 * Reihenfolge ist Absicht: Die Marken mit den engsten Bedingungen zuerst
 * (das Wrack braucht Strand AM Wasser), die beweglichen zuletzt. Sonst
 * nimmt der Torbogen die einzige Wiese weg, auf die auch die Mühle
 * gepasst hätte.
 *
 * Es gibt KEINEN Zufall darin: Gewählt wird immer die beste Stelle. Zwei
 * Spieler mit demselben Samen finden dieselbe Insel, und eine Marke, die
 * mal hier und mal dort steht, wäre kein Wahrzeichen.
 *
 * @returns {Array} [{marke, tx, ty}] – nur die, für die ein Platz da war
 */
export function markenPlaetze(welt) {
  const gesetzt = [];
  const out = [];
  for (let i = 0; i < MARKEN.length; i++) {
    const m = MARKEN[i];
    // Zwei Durchgänge: erst mit vollem Mindestabstand, und wenn sich
    // damit kein Platz findet, mit dem kleineren Notabstand.
    //
    // Denn eine Marke, die es auf zwei von acht Inseln nicht gibt, ist
    // kein Wahrzeichen – und genau das passierte Steinkreis und hohlem
    // Baum, wenn die Heide oder der Nadelwald auf einer Insel klein
    // ausfiel. Zwei Marken in fünfzehn Kacheln Abstand sind ein
    // schlechterer Kompromiss als keine Marke, aber eben ein besserer
    // als gar keine.
    const beste = sucheStelle(welt, m, gesetzt, MIN_ABSTAND)
      || sucheStelle(welt, m, gesetzt, NOT_ABSTAND);
    if (!beste) continue;
    gesetzt.push(beste);
    out.push({ marke: m, tx: beste[0], ty: beste[1] });
  }
  return out;
}

/** Die beste Stelle für eine Marke bei diesem Mindestabstand – oder null. */
function sucheStelle(welt, m, gesetzt, minAbstand) {
  let beste = null;
  let bestWert = -1;
  for (let ty = 3; ty < MAP_H - 3; ty++) {
    for (let tx = 3; tx < MAP_W - 3; tx++) {
      {
        if (!m.passt(welt, tx, ty)) continue;
        // Mindestabstand als HARTE Bedingung, nicht als Bonus.
        //
        // Erst stand er nur in der Bewertung – und prompt landeten auf
        // einem Samen Gerippe und hohler Baum fünfzehn Kacheln
        // auseinander, weil die Stelle sonst so gut passte. Zwei
        // Wahrzeichen in Sichtweite sind ein Wahrzeichen; die
        // Bewertung darf darüber nicht abstimmen dürfen.
        if (zuNah(gesetzt, tx, ty, minAbstand)) continue;
        if (!genugPlatz(welt, tx, ty, m.frei, m.kranz)) continue;
        const wert = m.gut(welt, tx, ty, gesetzt)
          + abstandZu(gesetzt, tx, ty) * 0.35;
        if (wert <= bestWert) continue;
        bestWert = wert;
        beste = [tx, ty];
      }
    }
  }
  return beste;
}

/**
 * Ist rings um die Kachel genug begehbarer Boden?
 *
 * Geprüft wird ein Kranz und nicht die Fläche: Eine Marke darf auf einer
 * Landzunge stehen, solange man um sie herumgehen kann. Mit einer vollen
 * Flächenprüfung fiele der Leuchtturm von jeder Landspitze herunter –
 * und genau dort gehört er hin.
 */
function genugPlatz(welt, tx, ty, frei, kranzMin) {
  const r = Math.ceil(frei / TILE_SIZE);
  let land = 0;
  let k = 0;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const t = welt.tileAtTile(tx + dx, ty + dy);
      k++;
      if (isWalkable(t)) land++;
    }
  }
  if (!k) return false;
  // Die eigene Kachel und ihre direkten Nachbarn müssen frei sein,
  // sonst steht die Marke halb in einer Felswand.
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!isWalkable(welt.tileAtTile(tx + dx, ty + dy))) return false;
    }
  }
  // Und man muss HERUMGEHEN können.
  //
  // Der Flächenanteil allein reichte nicht: Auf einer Landzunge ist die
  // Fläche ringsum zur Hälfte Land und der KRANZ trotzdem fast ganz
  // Wasser. Das Wrack landete auf einem Samen genau dort – sieben von
  // vierundzwanzig Kacheln begehbar, eine Sackgasse mit Wahrzeichen.
  let kranz = 0;
  let kranzN = 0;
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== 3) continue;
      kranzN++;
      if (isWalkable(welt.tileAtTile(tx + dx, ty + dy))) kranz++;
    }
  }
  if (kranz < kranzN * (kranzMin == null ? 0.5 : kranzMin)) return false;
  return land / k > 0.45;
}
