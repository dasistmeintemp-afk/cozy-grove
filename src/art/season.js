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
    grass: '#c3dd85', grassLight: '#dcecab', grassDark: '#9cbb62',
    leaf: '#a9d05e', leafLight: '#d0e88f', leafDark: '#7ba644', leafDeep: '#557d2f',
    birchLeaf: '#c8de79', birchLight: '#e4f0aa', birchDark: '#9dbb58', birchDeep: '#77953d',
    // Der Ahorn treibt aus: junges Grün mit einem rötlichen Rand, wie die
    // Blüten echter Ahorne im März. Bliebe er herbstlich orange, stünden
    // mitten im Frühling zwei Dutzend Bäume herum, die tot aussehen.
    autumn: '#b7cf6a', autumnLight: '#d9e79a', autumnDark: '#8fae4a', autumnDeep: '#a06a4e',
    moss: '#aec377',
  },
  summer: {
    // Sattes, tiefes Grün – der Hochsommer soll nicht wie der Frühling
    // aussehen, sonst ist ein halbes Jahr lang dasselbe Bild.
    grass: '#a9cc6c', grassLight: '#c9de92', grassDark: '#84a44f',
    leaf: '#8bb845', leafLight: '#b6d474', leafDark: '#628c33', leafDeep: '#436526',
    birchLeaf: '#a9c95e', birchLight: '#cfe28c', birchDark: '#82a046', birchDeep: '#5f7c30',
    autumn: '#9dbb52', autumnLight: '#c3d883', autumnDark: '#77953a', autumnDeep: '#8a6a3c',
    moss: '#94ac60',
  },
  autumn: {
    grass: '#c9cd74', grassLight: '#e0dc9c', grassDark: '#a3a355',
    leaf: '#d8a94e', leafLight: '#eecb84', leafDark: '#b7822f', leafDeep: '#8d5a21',
    birchLeaf: '#e0c761', birchLight: '#f2e096', birchDark: '#b89b41', birchDeep: '#8e7530',
    // Im Herbst brennt der Ahorn – hier steht die Grundpalette, und genau
    // deshalb ist das die Jahreszeit, für die diese Insel gemalt wurde.
    moss: '#b0ab63',
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
