/** Zentrale Farbwelt. Warm, gedaempft, „cozy“. */

export const PAL = {
  // Boden
  grass: '#5f9a52',
  grassDark: '#4a7f42',
  grassLight: '#7cb567',
  grassDry: '#93a05a',
  sand: '#ddc79a',
  sandDark: '#c6ac7d',
  dirt: '#8a6a49',
  dirtDark: '#6f5439',
  path: '#b39a72',
  pathDark: '#9a8161',
  stone: '#8d8f96',
  stoneDark: '#6b6d75',
  stoneLight: '#adb0b8',

  // Wasser
  water: '#3f86b8',
  waterDeep: '#2a5f8c',
  waterShallow: '#68b1d6',
  foam: '#dff1f7',

  // Pflanzen
  leaf: '#4f8f45',
  leafDark: '#3a6c34',
  leafLight: '#75b862',
  pine: '#37714f',
  pineDark: '#27573c',
  autumn: '#c9762c',
  autumnDark: '#a1541c',
  bark: '#6b4a2f',
  barkDark: '#4e3521',
  barkLight: '#8a6242',

  // Akzente
  warm: '#e8a44c',
  warmDeep: '#c9762c',
  ember: '#ff9a3c',
  emberCore: '#ffd88a',
  berry: '#c3486b',
  berryDark: '#962f4e',
  flowerA: '#e4657f',
  flowerB: '#f0d264',
  flowerC: '#9d7fd6',
  flowerD: '#e9f0f5',
  mushroom: '#d4543f',
  mushroomStem: '#f0e2cd',

  // Geister & Figuren
  ghost: '#cfe3ef',
  ghostDeep: '#9dbdd2',
  skin: '#e9c6a0',
  cloth: '#4f6d8f',
  clothWarm: '#b4573f',

  // Metall / Kram
  copper: '#c9793f',
  iron: '#9aa3ad',
  gold: '#e8c34c',
  glass: '#a9d7e0',
  bone: '#ece2cc',
  cloth2: '#7d6b9e',
  wood: '#9a6b40',
  woodDark: '#75512f',

  // Schrift / UI im Canvas
  ink: '#2a2118',
  inkSoft: '#5b4a38',
  white: '#f6f1e6',
  shadow: 'rgba(20, 26, 20, 0.28)',
};

/** Tageszeit-Tönungen (multiplikativ ueber die Welt gelegt). */
export const TINTS = {
  dawn: { color: '#5a4a7a', alpha: 0.3 },
  morning: { color: '#ffd9a0', alpha: 0.1 },
  day: { color: '#ffffff', alpha: 0 },
  evening: { color: '#e08b4a', alpha: 0.2 },
  dusk: { color: '#3d3b6e', alpha: 0.36 },
  night: { color: '#141b38', alpha: 0.56 },
};

/** Ton, in den die entfaerbte Welt gezogen wird – kaltes Schiefergrau. */
export const DESATURATED_TINT = { r: 92, g: 106, b: 122, mix: 0.24 };

// Helligkeiten werden zusammengezogen: sonst werden helle Farben (Blueten,
// Sand) im Graumodus zu grellem Weiss und stechen mehr hervor als in Farbe.
const GRAY_FLOOR = 44;
const GRAY_RANGE = 0.62;

/**
 * Entfaerbt Bilddaten an Ort und Stelle.
 * @param {Uint8ClampedArray} d RGBA-Daten
 * @param {Uint8ClampedArray|null} waterMask optionale Maske; wo sie deckend ist,
 *        wird zusaetzlich abgedunkelt – sonst waere Wasser von Wiese kaum zu
 *        unterscheiden, sobald die Farbe fehlt.
 */
export function desaturatePixels(d, waterMask) {
  const t = DESATURATED_TINT;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    let lum = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
    lum = GRAY_FLOOR + lum * GRAY_RANGE;
    let mix = t.mix;
    if (waterMask && waterMask[i + 3] > 8) {
      lum *= 0.62;
      mix = 0.5;
    }
    d[i] = lum + (t.r - lum) * mix;
    d[i + 1] = lum + (t.g - lum) * mix;
    d[i + 2] = lum + (t.b - lum) * mix;
  }
}
