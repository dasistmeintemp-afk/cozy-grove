/** Bodenkacheln: Typen, Grundfarben, Begehbarkeit. */
import { INK } from './painted.js';

export const T = {
  WATER_DEEP: 0,
  WATER: 1,
  SAND: 2,
  GRASS: 3,
  DIRT: 4,
  PATH: 5,
  BRIDGE: 6,
  ROCKFLOOR: 7,
  /**
   * Watt – der Meeresboden, der bei Niedrigwasser frei liegt.
   *
   * Eine eigene Kachelart und nicht einfach Sand: Wer bei Ebbe hinausläuft,
   * soll SEHEN, wo das Wasser sonst steht. Mit Sand sähe das Watt aus wie
   * ein Strand, der immer schon da war, und das Besondere am Tag wäre
   * unsichtbar.
   *
   * Sie liegt auf derselben Ebene wie Sand (2), damit die Übergänge zum
   * Strand weich bleiben – und sie ist begehbar, womit die gesamte
   * Kollision ohne eine einzige neue Zeile stimmt: `canStand` fragt nur
   * `isWalkable(tileAt(...))`.
   */
  TIDEFLAT: 8,
};

export const TILE_SIZE = 64;

/** Höhere Ebene überlagert niedrigere und bekommt einen weichen Rand. */
export const TILE_DEF = {
  0: { name: 'water_deep', base: INK.waterDark, layer: 0, walk: false },
  1: { name: 'water', base: INK.water, layer: 1, walk: false },
  2: { name: 'sand', base: INK.sand, layer: 2, walk: true },
  3: { name: 'grass', base: INK.grass, layer: 3, walk: true },
  4: { name: 'dirt', base: INK.dirt, layer: 4, walk: true },
  7: { name: 'rockfloor', base: INK.rock, layer: 4, walk: true },
  // Dunkler und kühler als Sand: nasser Grund, der eben noch unter Wasser
  // lag. Zwischen `sand` (#f7edd4) und `water` (#63c8c9) gemischt, mit
  // einem Stich ins Graue – reiner Mischwert sah aus wie blasser Türkis.
  8: { name: 'tideflat', base: '#cbbf9e', layer: 2, walk: true },
  5: { name: 'path', base: '#dccaa6', layer: 5, walk: true },
  6: { name: 'bridge', base: INK.wood, layer: 6, walk: true },
};

export function isWalkable(t) {
  const d = TILE_DEF[t];
  return !!(d && d.walk);
}

export function isWater(t) {
  return t === T.WATER || t === T.WATER_DEEP;
}
