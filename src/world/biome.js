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
  MAP_W, MAP_H, tileIndex, generateTiles, CAMP_TILE,
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
  WUESTE: 9,
  STEPPE: 10,
  DSCHUNGEL: 11,
  MANGROVE: 12,
  BAMBUSHAIN: 13,
};

export const BIOM_NAMEN = [
  'Wiese', 'Birkenhain', 'Nadelwald', 'Heide', 'Blumenwiese', 'Geröll',
  'Sumpf', 'Obstwiese', 'Totholz',
  'Wüste', 'Steppe', 'Dschungel', 'Mangrovenwald', 'Bambushain',
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
    bewuchs: 0.35,
  },

  /* --------------------------------------------------- Die neuen Zonen */
  /**
   * Die Wüste.
   *
   * Sie ist die leerste Gegend des Spiels, und das ist keine Sparsamkeit,
   * sondern ihr Inhalt: Weite entsteht dadurch, dass NICHTS im Weg steht.
   * Eine dicht bepflanzte Wüste wäre ein Garten mit Kakteen.
   *
   * Die Dichte am Boden ist trotzdem hoch – aber alles davon ist flach
   * (Dünengras, Dürrbusch). Man sieht über die ganze Gegend hinweg und
   * läuft gleichzeitig nicht über blanken Sand. Genau das ist der
   * Unterschied zwischen Weite und Leere.
   */
  [BIOM.WUESTE]: {
    name: 'Wüste',
    baeume: [['kaktus', 5], ['duerrbusch', 2]],
    dichteBaum: 2.5,
    busch: 2,
    boden: [['duenengras', 18], ['feigenkaktus', 5], ['agave', 4],
      ['wuestenfels', 4], ['schaedel', 0.6]],
    ton: ['duene', 0.62],
    // Auf Sand wächst kein Rasen. Der Bodenmaler zeichnet sonst auf
    // jede Graskachel seine Grasbüschel, und in der Wüste sah man den
    // Sandton mit einer Wiese darauf.
    bewuchs: 0,
  },
  /**
   * Die Steppe – der Übergang, nicht der Gegensatz.
   *
   * Zwischen Wiese und Wüste darf keine Kante liegen. Die Steppe hat
   * deshalb von beiden etwas: Gras wie die Wiese, aber hüfthoch und
   * ausgedörrt, und einzelne Trockenpflanzen wie die Wüste. Ohne sie
   * stößt grüne Wiese an gelben Sand, und das liest sich als Fehler.
   */
  [BIOM.STEPPE]: {
    name: 'Steppe',
    baeume: [['tree_wind', 3], ['kaktus', 1]],
    dichteBaum: 2,
    busch: 4,
    boden: [['steppengras', 24], ['distel', 8], ['duerrbusch', 6],
      ['herb', 4], ['rock_small', 3]],
    ton: ['steppe', 0.4],
    // Ein Drittel: In der Steppe wächst Gras, nur licht und in Büscheln
    // – das Steppengras macht die Arbeit, der Boden hält sich zurück.
    bewuchs: 0.3,
  },
  /**
   * Der Dschungel – die dichteste Gegend des Spiels.
   *
   * Hier gilt das Gegenteil der Wüste: Dichte IST der Inhalt. Mit 22
   * Bäumen je 100 Kacheln steht er noch über dem Nadelwald (17), und
   * dazu kommt ein voller Boden aus Riesenblättern. Dass man nicht weit
   * sieht, ist der Punkt.
   *
   * Die Lianen zählen zum Boden, obwohl sie von oben hängen: Sie sind
   * nicht `solid`, man läuft unter ihnen durch, und sie verhalten sich
   * damit wie Streugut und nicht wie ein Baum.
   */
  [BIOM.DSCHUNGEL]: {
    name: 'Dschungel',
    baeume: [['dschungelbaum', 7], ['palme', 3], ['bambus', 2]],
    /**
     * Sechsundzwanzig je 100 Kacheln – die höchste Dichte des Spiels,
     * über dem Nadelwald (17) und dem Bambushain (22).
     *
     * Die Zahl ist gemessen, und zwar zweimal. Beim ersten Mal falsch:
     * Eine Prüfung meldete, die dichtesten Stellen der Insel seien kein
     * Dickicht mehr, und die naheliegende Antwort war, die Dichte
     * hochzudrehen. Sie hat nichts geholfen – weil die Prüfung Bäume
     * an ihrem NAMEN erkannte (`tree_`) und damit ausgerechnet die
     * Bäume der neuen Zonen nicht mitzählte. Der dichteste Wald des
     * Spiels war für sie unsichtbar.
     *
     * Nach der Korrektur stand die Messung bei knapp 8 je 100 Kacheln
     * für die dichtesten zehn Prozent, also haarscharf an der Schwelle.
     * Erst DANN war die Erhöhung begründet: Ein Drittel der Insel ist
     * jetzt trockene Zone und fast baumfrei, und das zieht die ganze
     * Verteilung nach unten. Wenn es Weite geben soll, muss es auch
     * Dickicht geben.
     */
    dichteBaum: 20,
    /**
     * Gekürzt von 55 auf 33 je 100 Kacheln – gemessen, nicht gefühlt.
     *
     * Der erste Dschungel hatte 55 Dinge am Boden, 26 Bäume und 8
     * Büsche. Gemessen am Abstand zum nächsten Tuschestrich lagen 3,3
     * Prozent der Fläche weiter als zwanzig Bildpunkte von jedem Strich
     * entfernt; im Vorbild sind es 12,2 Prozent, auf unserem Lagerplatz
     * 14. Der Dschungel war also VIERMAL dichter als alles, was es sonst
     * zu sehen gibt – und dichter heisst ab einem gewissen Punkt nicht
     * mehr üppig, sondern unlesbar: Seli verschwand darin.
     *
     * Er soll der dichteste Ort des Spiels bleiben, aber einer, in dem
     * man sich noch sieht.
     */
    boden: [['riesenblatt', 14], ['liane', 7], ['farn', 7],
      ['mushroom', 4], ['orchidee', 2]],
    busch: 5,
    ton: ['dschungelTief', 0.3],
    // Unter geschlossenem Kronendach kommt kein Gras durch – derselbe
    // Grund wie im Nadelwald, nur stärker.
    bewuchs: 0.3,
  },
  /**
   * Der Mangrovenwald – nasse Füße am Rand des Dschungels.
   *
   * Er liegt zwischen Wasser und Dschungel und ist damit das, was der
   * Sumpf für den gemäßigten Teil ist. Beide teilen sich Schilf und
   * Farn; der Unterschied sind die Stelzwurzeln, und die sieht man.
   */
  [BIOM.MANGROVE]: {
    name: 'Mangrovenwald',
    baeume: [['mangrove', 9], ['palme', 2]],
    dichteBaum: 11,
    busch: 2,
    boden: [['reeds', 20], ['farn', 12], ['riesenblatt', 8], ['mushroom', 5]],
    ton: ['schlick', 0.34],
    // Schlick, kein Rasen.
    bewuchs: 0.15,
  },
  /**
   * Der Bambushain – lauter Senkrechte.
   *
   * Dieselbe Rolle wie der Birkenhain im gemäßigten Teil: fast nur eine
   * Art, und dicht. Das ist die auffälligste Gruppe, die es gibt, und sie
   * kostet keine neue Grafik.
   */
  [BIOM.BAMBUSHAIN]: {
    name: 'Bambushain',
    baeume: [['bambus', 13], ['dschungelbaum', 1]],
    dichteBaum: 18,
    busch: 1,
    boden: [['riesenblatt', 9], ['farn', 7], ['orchidee', 3], ['grass_tuft', 6]],
    ton: ['bambus', 0.18],
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
/* ------------------------------------------------------------- Klimazonen */

export const KLIMA = { FEUCHT: 0, GEMAESSIGT: 1, TROCKEN: 2 };
export const KLIMA_NAMEN = ['Feuchte Zone', 'Gemäßigte Zone', 'Trockene Zone'];

/**
 * Was in welcher Klimazone wächst.
 *
 * **Warum Klimazonen die Bereiche ablösen.** Vorher hing das Biom am
 * BEREICH – Lager, Wald, Klippen, Stille Insel –, und jeder Bereich hatte
 * seine eigene Liste. Das hat funktioniert, solange alle vier Listen aus
 * derselben gemäßigten Familie kamen: Ein Birkenhain neben einem
 * Nadelwald ist egal, wo die Grenze liegt.
 *
 * Mit Wüste und Dschungel geht das nicht mehr. Die Bereichsgrenzen sind
 * Linien, die der Flusslauf und der Sund gezogen haben – sie sind da, wo
 * sie sind, und eine Wüste, die an einer Flussbiegung endet, ist keine
 * Wüste, sondern ein Beet. Klima dagegen hat einen GRUND, sich zu ändern:
 * Es wird nach einer Seite hin trockener. Deswegen laufen die Zonen quer
 * über die Karte und nicht an den Bereichen entlang.
 *
 * **Die Reihenfolge ist eine Reihe, kein Ring.** Feucht grenzt an
 * gemäßigt, gemäßigt an trocken – und feucht grenzt NIE an trocken. Ein
 * Dschungel neben einer Düne liest sich als Fehler, egal wie schön beide
 * einzeln sind. Dass die gemäßigte Zone dazwischenliegt, ist deshalb
 * nicht nur Heimat, sondern auch Puffer.
 *
 * Innerhalb einer Zone gilt weiter dieselbe Regel wie vorher: Das erste
 * Biom ist der Grundton, das letzte das Ausrufezeichen.
 */
export const BIOME_JE_KLIMA = {
  [KLIMA.FEUCHT]: [BIOM.DSCHUNGEL, BIOM.BAMBUSHAIN, BIOM.MANGROVE,
    BIOM.SUMPF, BIOM.TOTHOLZ],
  [KLIMA.GEMAESSIGT]: [BIOM.WIESE, BIOM.NADELWALD, BIOM.BIRKENHAIN,
    BIOM.OBSTWIESE, BIOM.BLUMENWIESE],
  [KLIMA.TROCKEN]: [BIOM.STEPPE, BIOM.WUESTE, BIOM.HEIDE, BIOM.GEROELL,
    BIOM.TOTHOLZ],
};

/**
 * Wie weit eine Kachel auf der Trockenachse liegt – vor dem Zuschnitt.
 *
 * Die Achse läuft von Südwesten (feucht) nach Nordosten (trocken).
 *
 * Welche Richtung, ist gemessen und nicht gewählt: Das Lager steht fest
 * bei Kachel 66/93, die Küstenlinie wird gewürfelt, und je nach Achse
 * liegt das Lager an ganz verschiedenen Stellen der Reihe. Über fünf
 * Inselwürfe gemessen lag sein Rang auf der Nord-Süd-Achse bei 76 bis
 * 81 Prozent, auf der West-Ost-Achse bei 58 bis 69, und auf dieser hier
 * bei 34 bis 43. Je weiter außen das Lager liegt, desto mehr muss das
 * Fenster der gemäßigten Zone hinausragen – bei der ersten Fassung
 * (Nordwest nach Südost, Lagerrang 74 Prozent) blieben für die trockene
 * Zone drei Prozent des Landes übrig, und nach dem Glätten NULL. Die
 * Wüste war gebaut und kam auf keiner Insel vor.
 *
 * Was nicht beliebig ist, ist dass es eine GERADE Achse gibt und nicht
 * ein Rauschfeld. Mit Rauschen
 * allein lägen Wüstenflecken im Dschungel, und die Welt wäre wieder ein
 * Flickenteppich – nur mit größeren Flicken.
 *
 * Das Rauschen kommt trotzdem dazu, sonst wären die Zonengrenzen
 * schnurgerade Diagonalen. Sein Anteil ist mit 0,22 bewusst klein: Es
 * soll die Grenze ausbeulen, nicht verwürfeln.
 */
function klimaRoh(tx, ty, n) {
  const gerade = (tx + (MAP_H - ty)) / (MAP_W + MAP_H);
  const welle = fbm(n, tx * 0.009 + 11, ty * 0.009 - 7, 2, 2.0, 0.5);
  return gerade * 0.78 + welle * 0.22;
}

/**
 * Wie viel Land jede der beiden äußeren Zonen bekommt.
 *
 * Zusammen sechzig Prozent; die restlichen vierzig bleiben gemäßigt, und
 * das Lager liegt darin. Das ist kein Kompromiss,
 * sondern der Spielort: Beete, Geister, Wege und das halbe Inventar
 * hängen daran, und eine Insel, auf der man zwei Drittel der Zeit durch
 * Sand läuft, ist ein anderes Spiel.
 */
const AUSSEN_ANTEIL = 0.3;

/**
 * Die Klimazone jeder Kachel – ums Lager herum verankert.
 *
 * **Warum verankert und nicht fest geschnitten.** Die naheliegende
 * Lösung wäre, die Achse bei einem Drittel und zwei Dritteln zu
 * schneiden. Dann hängt es aber am Inselwurf, in welcher Zone das Lager
 * landet – und bei einer Insel, deren Land zufällig im Südosten liegt,
 * wäre das Lager eine Wüstenstation. Das ist kein seltener Fall: Die
 * Küstenlinie wird gewürfelt, die Lagerkachel steht fest.
 *
 * Also andersherum: Das Lager IST die gemäßigte Mitte. Alle Landkacheln
 * werden nach ihrem Achsenwert sortiert, der Rang des Lagers gesucht, und
 * von dort aus ein Viertel des Landes in jede Richtung als gemäßigt
 * genommen. Was darüber liegt, wird trocken, was darunter liegt, feucht.
 *
 * Liegt das Lager nah am Rand der Achse, schrumpft eine der beiden
 * äußeren Zonen von selbst – und das ist richtig so: Lieber eine kleine
 * Wüste als ein Lager darin.
 */
export function klimaKarte(seed) {
  const s = seed >>> 0;
  if (KLIMA_CACHE.seed === s && KLIMA_CACHE.data) return KLIMA_CACHE.data;
  const tiles = generateTiles(s);
  const n = makeNoise2D(s ^ 0x3c6ef35f);
  const karte = new Uint8Array(MAP_W * MAP_H);
  karte.fill(KLIMA.GEMAESSIGT);

  const felder = [];
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const i = tileIndex(tx, ty);
      if (!isWalkable(tiles[i]) && tiles[i] !== T.CLIFF) continue;
      felder.push({ i: i, v: klimaRoh(tx, ty, n) });
    }
  }
  if (!felder.length) {
    KLIMA_CACHE.seed = s;
    KLIMA_CACHE.data = karte;
    return karte;
  }
  felder.sort(function (a, b) { return a.v - b.v; });

  const lagerWert = klimaRoh(CAMP_TILE.x, CAMP_TILE.y, n);
  let lagerRang = 0;
  while (lagerRang < felder.length && felder[lagerRang].v < lagerWert) lagerRang++;

  /**
   * Das Fenster muss drei Bedingungen gleichzeitig erfüllen, und die
   * Reihenfolge, in der sie durchgesetzt werden, ist die Rangfolge:
   *
   *   1. Das Lager liegt darin (sonst steht man in der Wüste).
   *   2. Beiden äußeren Zonen bleibt ein Mindestanteil (sonst ist eine
   *      davon gebaut und kommt nie vor – genau das ist passiert).
   *   3. Es ist so breit wie gewünscht.
   *
   * Die dritte gibt nach, wenn sie mit den ersten beiden kollidiert:
   * Lieber eine schmalere Heimat als keine Wüste.
   *
   * Gelöst wird das, indem BEIDE äußeren Zonen gleich groß werden und
   * gemeinsam schrumpfen, sobald das Lager nah an einem Ende liegt. Der
   * erste Versuch gab jeder Zone nur eine Untergrenze und ließ sie
   * sonst wachsen; weil das Lager auf dieser Achse bei 34 bis 43 Prozent
   * liegt, wurde die trockene Seite damit regelmäßig doppelt so groß
   * wie die feuchte. Auf Inselwurf 11 blieben für den Dschungel sechs
   * Prozent übrig, und eine Prüfung meldete, dass die dichtesten
   * Stellen der Insel kein Dickicht mehr sind – der dichteste Wald des
   * Spiels war zu klein geworden, um in der Statistik vorzukommen.
   */
  const aussen = Math.min(lagerRang, felder.length - lagerRang,
    Math.round(felder.length * AUSSEN_ANTEIL));
  const von = aussen;
  const bis = felder.length - aussen;
  for (let k = 0; k < von; k++) karte[felder[k].i] = KLIMA.FEUCHT;
  for (let k = bis; k < felder.length; k++) karte[felder[k].i] = KLIMA.TROCKEN;

  KLIMA_CACHE.seed = s;
  KLIMA_CACHE.data = karte;
  return karte;
}

const KLIMA_CACHE = { seed: -1, data: null };

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
  const klima = klimaKarte(s);
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
      /**
       * Größere Flecken, seit es mehr Biome gibt.
       *
       * Hier stand 0,013, und das war richtig, solange sich neun Biome
       * das Land teilten. Mit vierzehn fällt auf jedes weniger Fläche,
       * und bei gleichem Rauschmaßstab werden die Flecken entsprechend
       * kleiner: Eine Prüfung maß 8,7 Prozent Biomwechsel je Schritt,
       * also im Mittel elf Kacheln am Stück. Ein Biom, durch das man in
       * elf Schritten durch ist, ist kein Ort.
       *
       * Der Maßstab geht deshalb mit der Zahl der Biome mit.
       */
      const a = fbm(n, tx * 0.009, ty * 0.009, 1, 2.0, 0.5);
      const b = fbm(m, tx * 0.0101 + 60, ty * 0.0101 - 25, 1, 2.0, 0.5);
      const r = klima[i];
      if (!proBereich[r]) proBereich[r] = [];
      proBereich[r].push({ i: i, v: a * 0.6 + b * 0.4 });
    }
  }
  for (const r in proBereich) {
    const liste = BIOME_JE_KLIMA[r] || BIOME_JE_KLIMA[KLIMA.GEMAESSIGT];
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
