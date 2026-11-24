/**
 * Biome – warum eine Gegend nach einer Gegend aussieht.
 *
 * Die Insel hatte vier Bereiche, und alle vier waren „Wiese mit Bäumen".
 * Lager, Wald, Klippen und Stille Insel unterschieden sich in der Zahl
 * der Bäume und sonst in nichts – man konnte überall stehen und nicht
 * sagen, wo man ist. Genau das meint „die Welt sieht überall gleich aus",
 * und es ist kein Grafikproblem: Es fehlte die ZUSAMMENSETZUNG.
 *
 * Ein Biom ist deshalb keine Farbe, sondern eine Liste: Was wächst hier,
 * was liegt hier herum, und welchen Ton hat der Boden. Ein Birkenhain
 * besteht aus Birken, hellem Gras und Blumen; ein Nadelwald aus Kiefern,
 * Moos, Pilzen und wenig Licht; eine Heide aus Geröll, zähem Gras und
 * fast keinen Bäumen. Man erkennt sie, ohne dass irgendwo ein Schild
 * steht – so wie man einen Buchenwald von einem Fichtenforst
 * unterscheidet, ohne Botanik zu können.
 *
 * **Die Biome liegen QUER zu den Bereichen, nicht in ihnen.** Jeder
 * Bereich hat eine Auswahl, aus der sein Rauschen schöpft, und zwei
 * Bereiche teilen sich Biome. Sonst wären Biome nur neue Namen für die
 * alten vier Kästen, und die Grenze zwischen Wald und Klippen bliebe die
 * Linie, die sie heute ist.
 *
 * Hier steht nur die Tabelle und die Zuteilung. Was daraus folgt, steht
 * dort, wo es hingehört: der Streuwurf in `world.js`, der Bodenton im
 * Bodenmaler.
 */
import { makeNoise2D, fbm } from '../core/rng.js';
import { T, isWalkable } from '../art/tiles.js';
import {
  MAP_W, MAP_H, REGION, tileIndex, regionAt, generateTiles,
} from './worldgen.js';

export const BIOM = {
  WIESE: 0,
  BIRKENHAIN: 1,
  NADELWALD: 2,
  HEIDE: 3,
  BLUMENWIESE: 4,
  GEROELL: 5,
  SUMPF: 6,
  OBSTWIESE: 7,
  TOTHOLZ: 8,
};

export const BIOM_NAMEN = [
  'Wiese', 'Birkenhain', 'Nadelwald', 'Heide', 'Blumenwiese', 'Geröll',
  'Sumpf', 'Obstwiese', 'Totholz',
];

/**
 * Was ein Biom ausmacht.
 *
 *   baeume     Baumarten und wie dicht sie stehen (Zahl je 100 Kacheln)
 *   busch      Büsche je 100 Kacheln
 *   boden      Streugut, das den Boden ausmacht – das Kleinzeug
 *   ton        Bodenlasur: Farbe aus der Palette und Deckung
 *
 * Die Dichten sind je 100 Kacheln angegeben und nicht als absolute Zahl.
 * Vorher standen überall feste Zahlen („46 Bäume ins Lager"), und ein
 * Biom, das auf einer Insel groß und auf der nächsten klein ausfällt,
 * wäre damit einmal Wald und einmal Lichtung gewesen.
 */
export const BIOME = {
  [BIOM.WIESE]: {
    name: 'Wiese',
    baeume: [['tree_oak', 5], ['tree_maple', 3], ['tree_birch', 2]],
    dichteBaum: 9,
    busch: 5,
    boden: [['grass_tuft', 16], ['flower_pink', 3], ['flower_yellow', 3],
      ['flower_white', 3], ['herb', 4]],
    ton: null,
  },
  [BIOM.BIRKENHAIN]: {
    name: 'Birkenhain',
    // Fast nur Birken, und dicht: Ein Hain ist kein gemischter Wald,
    // sondern lauter weiße Stämme in einer Reihe. Das ist die auffälligste
    // Baumgruppe, die es gibt, und sie kostet keine neue Grafik.
    baeume: [['tree_birch', 11], ['tree_oak', 1]],
    dichteBaum: 15,
    busch: 2,
    boden: [['grass_tuft', 22], ['flower_white', 7], ['herb', 5], ['feather', 2]],
    ton: ['grassLight', 0.2],
  },
  [BIOM.NADELWALD]: {
    name: 'Nadelwald',
    baeume: [['tree_pine', 11], ['tree_birch', 1]],
    dichteBaum: 17,
    busch: 3,
    // Unter Nadeln wächst wenig Gras, dafür Moos und Pilze.
    boden: [['mushroom', 11], ['grass_tuft', 6], ['herb', 3], ['flower_violet', 2]],
    ton: ['leafDeep', 0.17],
  },
  [BIOM.HEIDE]: {
    name: 'Heide',
    // Die Heide ist der Gegenentwurf zum Wald: offen, windig, kaum ein
    // Baum. Ohne eine Gegend, in der man WEIT sehen kann, ist eine Insel
    // aus Wald und Lichtung ein einziger Wald.
    baeume: [['tree_wind', 3], ['tree_pine', 1]],
    dichteBaum: 2.5,
    busch: 7,
    boden: [['grass_tuft', 20], ['rock_small', 5], ['herb', 5], ['flower_violet', 4]],
    ton: ['dirtDark', 0.14],
  },
  [BIOM.BLUMENWIESE]: {
    name: 'Blumenwiese',
    baeume: [['tree_maple', 4], ['tree_oak', 2]],
    dichteBaum: 4,
    busch: 4,
    boden: [['flower_pink', 11], ['flower_yellow', 11], ['flower_white', 8],
      ['flower_violet', 6], ['grass_tuft', 14], ['herb', 4]],
    ton: ['grassLight', 0.22],
  },
  [BIOM.SUMPF]: {
    name: 'Sumpf',
    // Schilf und Farn, kaum ein Baum und die nassesten Füße der Insel.
    // Der Sumpf ist der einzige Ort, an dem Schilf im Landesinneren
    // steht – sonst wächst es nur am Sandufer, und genau deshalb liest
    // man ihn sofort als „hier steht Wasser im Boden".
    baeume: [['tree_birch', 3], ['tree_wind', 1]],
    dichteBaum: 3,
    busch: 2,
    boden: [['reeds', 22], ['farn', 15], ['mushroom', 9], ['grass_tuft', 7]],
    ton: ['dirtDark', 0.24],
  },
  [BIOM.OBSTWIESE]: {
    name: 'Obstwiese',
    // Ahorn trägt als einziger Baum Früchte (siehe `paintTree`, `fruit`),
    // und hier steht er in Reihen statt vereinzelt. Dazu Beerenbüsche –
    // das ist die Gegend, in die man geht, wenn man etwas zum Kochen
    // braucht.
    baeume: [['tree_maple', 9], ['tree_oak', 2]],
    dichteBaum: 10,
    busch: 11,
    boden: [['grass_tuft', 14], ['flower_yellow', 7], ['flower_white', 5],
      ['herb', 7]],
    ton: ['grassLight', 0.16],
  },
  [BIOM.TOTHOLZ]: {
    name: 'Totholz',
    // Ein alter Kahlschlag: lauter Stümpfe, dazwischen Pilze und Farn
    // und nur vereinzelt ein nachgewachsener Baum. Die Stümpfe lassen
    // sich nicht wegräumen – das ist der Punkt. Hier hat jemand vor
    // langer Zeit gearbeitet und ist nie wiedergekommen.
    //
    // Deshalb auch nur vier je 100 Kacheln: Ein Feld voller fester
    // Hindernisse ist ein Irrgarten, eine Handvoll ist eine Geschichte.
    baeume: [['tree_pine', 2], ['tree_birch', 1]],
    dichteBaum: 2.5,
    busch: 3,
    boden: [['tree_stump', 4], ['mushroom', 14], ['farn', 10],
      ['grass_tuft', 9], ['herb', 4]],
    ton: ['leafDeep', 0.12],
  },
  [BIOM.GEROELL]: {
    name: 'Geröll',
    baeume: [['tree_pine', 2]],
    dichteBaum: 1.5,
    busch: 1,
    boden: [['rock_small', 16], ['rock_big', 6], ['grass_tuft', 7], ['herb', 2]],
    ton: ['rockShade', 0.2],
  },
};

/**
 * Welche Biome in welchem Bereich vorkommen.
 *
 * Die Reihenfolge ist die Reihenfolge der Rauschschwellen: Das erste
 * Biom bekommt das meiste Land. Blumenwiese und Geröll stehen bewusst
 * hinten – beide sind Ausrufezeichen, und ein Ausrufezeichen, das ein
 * Drittel der Insel bedeckt, ist ein Punkt.
 */
export const BIOME_JE_BEREICH = {
  [REGION.CAMP]: [BIOM.WIESE, BIOM.OBSTWIESE, BIOM.BIRKENHAIN, BIOM.BLUMENWIESE],
  [REGION.FOREST]: [BIOM.NADELWALD, BIOM.BIRKENHAIN, BIOM.SUMPF, BIOM.TOTHOLZ,
    BIOM.WIESE],
  [REGION.CLIFFS]: [BIOM.NADELWALD, BIOM.HEIDE, BIOM.GEROELL, BIOM.TOTHOLZ,
    BIOM.WIESE],
  [REGION.ISLE]: [BIOM.HEIDE, BIOM.SUMPF, BIOM.NADELWALD, BIOM.GEROELL,
    BIOM.BIRKENHAIN],
};

const CACHE = { seed: -1, data: null };

/**
 * Die Biomkarte zu einem Samen.
 *
 * Eigenes Rauschen, eigener Maßstab: 0,038 ergibt Flecken von rund
 * fünfundzwanzig Kacheln Durchmesser. Das ist die Größe, bei der man
 * beim Durchlaufen merkt, dass man den Ort gewechselt hat, bevor man ihn
 * schon wieder verlässt – bei 0,08 lief man alle zehn Schritte durch ein
 * anderes Biom, und die Insel sah aus wie ein Flickenteppich.
 */
export function biomeFuer(seed) {
  const s = seed >>> 0;
  if (CACHE.seed === s && CACHE.data) return CACHE.data;
  const tiles = generateTiles(s);
  const n = makeNoise2D(s ^ 0x6b43a9f1);
  const m = makeNoise2D(s ^ 0x1f83d9ab);
  const karte = new Uint8Array(MAP_W * MAP_H);

  /**
   * Die Grenzen werden GEMESSEN, nicht gesetzt – wie bei den Höhen.
   *
   * Mit festen Schwellen auf dem Rauschen hing es am Samen, wie groß ein
   * Biom ausfällt: Bei großen Flecken (die man will) verschwand auf einer
   * Insel die Blumenwiese auf 0,2 Prozent, bei kleinen Flecken war die
   * Insel ein Flickenteppich mit einem Biomwechsel alle elf Schritte.
   * Beides ist falsch, und zwischen beidem gibt es keine feste Schwelle,
   * die für alle Samen stimmt.
   *
   * Also: je Bereich alle Rauschwerte sammeln, sortieren und bei
   * ANTEILEN schneiden. Weil das Rauschen glatt ist, sind die
   * Schnittflächen zusammenhängend – man bekommt große Flecken UND jedes
   * Biom. Die Anteile sind ungleich: Das erste Biom einer Liste ist der
   * Grundton des Bereichs, das letzte das Ausrufezeichen.
   */
  const ANTEILE = [0.32, 0.23, 0.18, 0.15, 0.12];
  const proBereich = {};
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const i = tileIndex(tx, ty);
      const t = tiles[i];
      if (!isWalkable(t) && t !== T.CLIFF) continue;
      if (t === T.SAND || t === T.TIDEFLAT || t === T.PATH || t === T.BRIDGE) continue;
      // Zwei Rauschfelder, nicht eins: Mit einem einzigen liegen die
      // Biome in Ringen um dieselben Mittelpunkte, weil Schwellen auf
      // einem Rauschwert Höhenlinien sind. Zwei Felder spannen eine
      // Fläche auf, und darin können Flecken nebeneinander liegen.
      // Eine Oktave, nicht drei, und ein grober Maßstab.
      //
      // Beides gemessen: Mit drei Oktaven hat das Rauschen so viel
      // Feinstruktur, dass die Schnittflächen der Anteile in viele kleine
      // Inseln zerfallen – bei sonst gleichen Zahlen stieg der Anteil der
      // Biomwechsel von 6 auf 10 Prozent. Eine Oktave ist glatt, und auf
      // einem glatten Feld ist jede Höhenschicht zusammenhängend.
      // 0,013 ergibt Flecken von rund fünfzig Kacheln – eine Gegend, durch
      // die man eine Weile läuft.
      const a = fbm(n, tx * 0.013, ty * 0.013, 1, 2.0, 0.5);
      const b = fbm(m, tx * 0.0146 + 60, ty * 0.0146 - 25, 1, 2.0, 0.5);
      const r = regionAt(tx, ty);
      if (!proBereich[r]) proBereich[r] = [];
      proBereich[r].push({ i: i, v: a * 0.6 + b * 0.4 });
    }
  }
  for (const r in proBereich) {
    const liste = BIOME_JE_BEREICH[r] || BIOME_JE_BEREICH[REGION.CAMP];
    const felder = proBereich[r];
    felder.sort(function (x, y) { return x.v - y.v; });
    let summe = 0;
    for (let k = 0; k < liste.length; k++) summe += ANTEILE[k] || 0.1;
    let von = 0;
    for (let k = 0; k < liste.length; k++) {
      const anteil = (ANTEILE[k] || 0.1) / summe;
      const bis = k === liste.length - 1 ? felder.length
        : Math.min(felder.length, von + Math.round(felder.length * anteil));
      for (let q = von; q < bis; q++) karte[felder[q].i] = liste[k];
      von = bis;
    }
  }

  glaette(karte, tiles);
  CACHE.seed = s;
  CACHE.data = karte;
  return karte;
}

/**
 * Einzelne Kacheln einsammeln, die aus der Reihe tanzen.
 *
 * Rohes Rauschen erzeugt an den Biomgrenzen ausgefranste Säume und
 * einzelne Kacheln mitten im Nachbarbiom. Sichtbar ist davon nichts –
 * eine einzelne Kiefer in einem Birkenhain fällt niemandem auf –, aber
 * die Grenzen werden dadurch lang und zackig, und eine Prüfung maß auf
 * einer Insel alle elf Schritte einen Biomwechsel. Ein Biom, durch das
 * man in elf Schritten durch ist, ist kein Ort.
 *
 * Zwei Runden Mehrheitsentscheid über die acht Nachbarn, und nur bei
 * deutlicher Mehrheit (fünf von acht): Sonst frisst der Filter die
 * kleineren Biome in zwei Runden auf.
 */
function glaette(karte, tiles) {
  for (let runde = 0; runde < 2; runde++) {
    const kopie = karte.slice();
    for (let ty = 1; ty < MAP_H - 1; ty++) {
      for (let tx = 1; tx < MAP_W - 1; tx++) {
        const i = tileIndex(tx, ty);
        const t = tiles[i];
        if (t !== T.GRASS && t !== T.DIRT && t !== T.ROCKFLOOR && t !== T.CLIFF) continue;
        const zaehler = {};
        let beste = kopie[i];
        let bestN = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const j = tileIndex(tx + dx, ty + dy);
            const tj = tiles[j];
            if (tj !== T.GRASS && tj !== T.DIRT && tj !== T.ROCKFLOOR && tj !== T.CLIFF) continue;
            const b = kopie[j];
            zaehler[b] = (zaehler[b] || 0) + 1;
            if (zaehler[b] > bestN) { bestN = zaehler[b]; beste = b; }
          }
        }
        if (bestN >= 5) karte[i] = beste;
      }
    }
  }
}

/** Wie viele Kacheln je Biom – für Prüfungen und die Chronik. */
export function biomStand(karte, tiles) {
  const out = {};
  for (const k in BIOME) out[k] = 0;
  for (let i = 0; i < karte.length; i++) {
    if (!isWalkable(tiles[i])) continue;
    if (tiles[i] === T.SAND || tiles[i] === T.TIDEFLAT) continue;
    out[karte[i]] = (out[karte[i]] || 0) + 1;
  }
  return out;
}
