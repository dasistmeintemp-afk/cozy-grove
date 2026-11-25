/**
 * Die Farben der Jahreszeiten.
 *
 * Alles auf dieser Insel wird beim Start gemalt und danach nur noch
 * hingestellt. Das ist hier ein Geschenk: Wenn vor dem Malen feststeht, welche
 * Jahreszeit ist, tragen Wiese, Kronen und Büsche ihre Farbe von selbst – ohne
 * eine einzige zusätzliche Grafik und ohne einen Handgriff zur Laufzeit.
 *
 * Deshalb schreibt `applySeason` in die Palette, statt eine zweite daneben zu
 * stellen: Dreißig Malerroutinen lesen `INK.grass`, und keine von ihnen soll
 * wissen müssen, welcher Monat gerade ist.
 *
 * Muss VOR `initArt()` laufen. Danach wirkt es nicht mehr – die Grafiken
 * stehen dann schon.
 */
import { INK } from './painted.js';
import { TILE_DEF, T } from './tiles.js';

/**
 * Was sich je Jahreszeit ändert.
 *
 * Bewusst wenige Schlüssel: Wiese, Laub, Moos. Die Tinte, das Wasser, der
 * Sand und die Felsen bleiben, wie sie sind – sonst wäre es nicht mehr
 * dieselbe Insel, sondern vier verschiedene.
 *
 * Und keine Jahreszeit ist grau. Das Spiel handelt davon, Farbe zurück-
 * zubringen; ein trister Winter würde genau dem Signal widersprechen, um das
 * sich alles dreht. Der Winter ist hell und kühl, nicht farblos.
 */
export const SEASON_PALETTE = {
  spring: {
    // Dieselbe Drehung wie im Sommer, nur vierzehn Grad: Der Frühling
    // darf heller und eine Spur gelber bleiben – junges Laub IST
    // gelblicher –, aber nicht mehr khakifarben.
    grass: '#7fbe5e', grassLight: '#9bcb7e', grassDark: '#5ea144',
    leaf: '#60b33e', leafLight: '#89c866', leafDark: '#3f8f2c', leafDeep: '#266c1d',
    birchLeaf: '#80bf54', birchLight: '#a3ce7d', birchDark: '#5da13b', birchDeep: '#418027',
    // Der Ahorn treibt aus: junges Grün mit einem rötlichen Rand, wie die
    // Blüten echter Ahorne im März. Bliebe er herbstlich orange, stünden
    // mitten im Frühling zwei Dutzend Bäume herum, die tot aussehen.
    autumn: '#b7cf6a', autumnLight: '#d9e79a', autumnDark: '#8fae4a', autumnDeep: '#a06a4e',
    moss: '#72a855',
  },
  summer: {
    // Sattes, tiefes Grün – der Hochsommer soll nicht wie der Frühling
    // aussehen, sonst ist ein halbes Jahr lang dasselbe Bild.
    /**
     * Die Grüns liegen im GRÜNsektor, nicht im gelben.
     *
     * Beide Bilder nebeneinander gemessen, Farbtöne in Sektoren zu
     * dreissig Grad: Im Vorbild tragen fünf Sektoren über fünf Prozent,
     * der grösste ist Gelbgrün mit 32 Prozent – das Gras. Bei uns waren
     * es zwei Sektoren, Gelb mit 83 Prozent und Orange, und Gelbgrün
     * stand bei NULL.
     *
     * Die Ursache war ein Zahlenbereich: Unsere Grüns lagen bei 73 bis
     * 92 Grad, und bei 90 Grad endet der Gelbsektor. Das Gras des
     * Vorbilds liegt bei 93. Zehn bis zwanzig Grad bei einer Farbe, die
     * über die halbe Bildfläche einnimmt – damit kippt alles ins
     * Senffarbene. Helligkeit (146 gegen 146) und Sättigung (45 gegen
     * 41 Prozent) stimmten die ganze Zeit; nur der Ton war falsch.
     *
     * Jeder Ton wurde um sechzehn Grad gedreht und um sechs Punkte
     * gesättigt, die Helligkeit blieb unangetastet.
     *
     * **Nachtrag: die Helligkeit stimmte doch nicht.**
     *
     * Die erste Messung hatte den HSV-Wert verglichen – also nur den
     * stärksten Kanal – und dort stand es 155 zu 156. Gemessen wurde
     * danach die wahrgenommene Helligkeit derselben Grasflächen, und die
     * stand 163 zu 135. Achtundzwanzig Punkte. Das ist der Unterschied
     * zwischen einer Wiese und einer beleuchteten Wiese, und er erklärte
     * auch den Tiefton: Bildpunkte unter Helligkeit 150 machten im
     * Vorbild 56 Prozent aus, bei uns 29. Nicht weil dort mehr Tusche
     * liegt, sondern weil hier alles zu hell war.
     *
     * Beide Fehler kommen aus derselben Quelle: HSV-Wert ist nicht
     * Helligkeit. `#88cc60` und `#60cc88` haben denselben Wert und sehen
     * verschieden hell aus, weil Grün dreimal so viel zur Helligkeit
     * beiträgt wie Blau.
     *
     * Also ein zweites Mal gedreht und diesmal abgedunkelt: Wert mal
     * 0,8, Ton acht Grad weiter, Sättigung fünfeinhalb Punkte höher.
     * Danach Ton 94 gegen 97 Grad, Sättigung 48 gegen 49 Prozent,
     * Helligkeit 133 gegen 135. Abdunkeln ALLEIN hatte es übrigens
     * khakifarben gemacht – die Drehung und die Sättigung gehören dazu.
     *
     * Frühling und Herbst wurden mitgezogen (Wert mal 0,86 – beide
     * dürfen heller bleiben als der Hochsommer), der Winter nicht: Er
     * ist absichtlich hell und kühl.
     */
    grass: '#5ba344', grassLight: '#7bb260', grassDark: '#438330',
    leaf: '#3d9326', leafLight: '#65a94a', leafDark: '#27701d', leafDeep: '#185115',
    birchLeaf: '#58a139', birchLight: '#7cb45b', birchDark: '#408029', birchDeep: '#2b631c',
    autumn: '#6e953a', autumnLight: '#8fad5e', autumnDark: '#527727', autumnDeep: '#6e5c2a',
    moss: '#54893d',
  },
  autumn: {
    // Das Gras bleibt GRÜN, auch im Herbst.
    //
    // Hier stand `#c9cd74`: Rot 201, Grün 205 – also Khaki, praktisch
    // ohne Grünanteil. Zusammen mit dem orangen Laub lag damit das ganze
    // Bild in einer einzigen Farbfamilie, und ein Bild ohne Gegensatz
    // liest sich als Dunst, egal wie gut die Einzelteile sind. Im Vorbild
    // steht brennendes Laub IMMER über grünem Gras – daher kommt das
    // Leuchten, nicht aus der Sättigung des Laubs.
    //
    // Jetzt liegt Grün 23 Stufen über Rot. Gelblicher als im Sommer
    // bleibt es trotzdem, sonst wäre es kein Herbst.
    // Im Herbst nur zehn Grad: Das Gras soll gelblicher bleiben als im
    // Sommer – sonst ist es kein Herbst –, aber auch hier war Khaki zu
    // viel des Guten.
    grass: '#75a645', grassLight: '#94b969', grassDark: '#5b8733',
    leaf: '#d8a94e', leafLight: '#eecb84', leafDark: '#b7822f', leafDeep: '#8d5a21',
    birchLeaf: '#e0c761', birchLight: '#f2e096', birchDark: '#b89b41', birchDeep: '#8e7530',
    // Im Herbst brennt der Ahorn – hier steht die Grundpalette, und genau
    // deshalb ist das die Jahreszeit, für die diese Insel gemalt wurde.
    moss: '#849747',
  },
  winter: {
    // Kühl und hell, aber mit erkennbarem Grün: Bei #d3e0d4 lag die Sättigung
    // bei 6 % – das las sich als Grau, und genau das darf keine Jahreszeit
    // dieses Spiels. Ein Test rechnet es nach.
    grass: '#c6dfca', grassLight: '#e0efe1', grassDark: '#9fbca6',
    leaf: '#a7c2a4', leafLight: '#cfdfcb', leafDark: '#7f9c81', leafDeep: '#5d7761',
    birchLeaf: '#bfd2bb', birchLight: '#dfe9db', birchDark: '#96ac95', birchDeep: '#748a75',
    // Der Ahorn hat sein Laub verloren und trägt nur noch Rost.
    autumn: '#c0a184', autumnLight: '#dcc6ae', autumnDark: '#9b7d63', autumnDeep: '#7a5f49',
    pine: '#4f7d4c', pineDark: '#37603c', pineLight: '#719a5c',
    moss: '#a8bda6',
  },
};

/** Die Grundpalette, wie sie in painted.js steht – zum Zurücksetzen. */
const BASE = {};
for (const key in SEASON_PALETTE) {
  const p = SEASON_PALETTE[key];
  for (const k in p) if (!(k in BASE)) BASE[k] = INK[k];
}

let current = 'summer';

export function currentSeason() {
  return current;
}

/**
 * Setzt die Farben einer Jahreszeit.
 *
 * @param {string} id spring | summer | autumn | winter
 * @returns {string} die gesetzte Jahreszeit
 */
export function applySeason(id) {
  const p = SEASON_PALETTE[id] ? id : 'summer';
  // Erst alles zurück auf Sommer, dann die Abweichungen: Sonst bliebe beim
  // Wechsel von Winter auf Frühling der Nadelbaum winterlich stehen.
  for (const k in BASE) INK[k] = BASE[k];
  const set = SEASON_PALETTE[p];
  for (const k in set) INK[k] = set[k];

  // Die Kacheltabelle hat ihre Grundtöne beim Laden aus INK kopiert; sie
  // müssen mitgezogen werden, sonst bleibt der Boden sommerlich.
  TILE_DEF[T.GRASS].base = INK.grass;
  current = p;
  return p;
}
