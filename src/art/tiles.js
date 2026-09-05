/** Bodenkacheln: Grundfarben und Textur. */
import { PAL } from './palette.js';

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

export const TILE_SIZE = 16;

/** Hoehere Ebene ueberlagert niedrigere und bekommt einen ausgefransten Rand. */
export const TILE_DEF = {
  0: { name: 'water_deep', base: PAL.waterDeep, layer: 0, walk: false },
  1: { name: 'water', base: PAL.water, layer: 1, walk: false },
  2: { name: 'sand', base: PAL.sand, layer: 2, walk: true },
  3: { name: 'grass', base: PAL.grass, layer: 3, walk: true },
  4: { name: 'dirt', base: PAL.dirt, layer: 4, walk: true },
  5: { name: 'path', base: PAL.path, layer: 5, walk: true },
  6: { name: 'bridge', base: '#a8804f', layer: 6, walk: true },
  7: { name: 'rockfloor', base: PAL.stone, layer: 4, walk: true },
};

export function isWalkable(t) {
  const d = TILE_DEF[t];
  return !!(d && d.walk);
}

export function isWater(t) {
  return t === T.WATER || t === T.WATER_DEEP;
}

/** Textur einer Kachel – deterministisch aus den Kachelkoordinaten. */
export function paintTileTexture(g, type, x, y, rng) {
  switch (type) {
    case T.GRASS:
      g.speckle(x, y, 16, 16, PAL.grassDark, 7, rng);
      g.speckle(x, y, 16, 16, PAL.grassLight, 5, rng);
      if (rng() < 0.22) {
        const bx = x + 3 + Math.floor(rng() * 9);
        const by = y + 4 + Math.floor(rng() * 8);
        g.line(bx, by, bx - 1, by - 3, PAL.grassLight, 1);
        g.line(bx + 2, by, bx + 3, by - 3, PAL.grassDark, 1);
      }
      break;
    case T.SAND:
      g.speckle(x, y, 16, 16, PAL.sandDark, 6, rng);
      g.speckle(x, y, 16, 16, '#f0e0bc', 4, rng);
      break;
    case T.DIRT:
      g.speckle(x, y, 16, 16, PAL.dirtDark, 8, rng);
      g.speckle(x, y, 16, 16, '#a9855e', 4, rng);
      break;
    case T.PATH:
      g.ellipse(x + 4, y + 4, 3.4, 3, PAL.pathDark);
      g.ellipse(x + 12, y + 5, 3.4, 3, PAL.pathDark);
      g.ellipse(x + 5, y + 12, 3.4, 3, PAL.pathDark);
      g.ellipse(x + 12, y + 12, 3.4, 3, PAL.pathDark);
      g.speckle(x, y, 16, 16, '#c9b48d', 6, rng);
      break;
    case T.ROCKFLOOR:
      g.speckle(x, y, 16, 16, PAL.stoneDark, 9, rng);
      g.speckle(x, y, 16, 16, PAL.stoneLight, 5, rng);
      break;
    case T.BRIDGE:
      g.rect(x, y, 16, 1, '#c29a68');
      g.rect(x, y + 5, 16, 1, '#7d5c37');
      g.rect(x, y + 11, 16, 1, '#7d5c37');
      break;
    case T.WATER:
      g.speckle(x, y, 16, 16, PAL.waterShallow, 5, rng);
      break;
    case T.WATER_DEEP:
      g.speckle(x, y, 16, 16, '#20507a', 5, rng);
      break;
    default:
      break;
  }
}
