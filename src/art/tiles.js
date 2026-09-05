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
