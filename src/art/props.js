/** Weltobjekte: Baeume, Steine, Buesche, Lager, Deko. */
import { PAL } from './palette.js';
import { makeRng } from '../core/rng.js';

function p(w, h, ax, ay, paint) {
  return { w: w, h: h, ax: ax, ay: ay, paint: paint };
}

/* ---------- Baeume ---------- */

function leafyCanopy(g, cx, baseY, size, cMid, cDark, cLight, seed) {
  const rng = makeRng(seed);
  const blobs = [
    [0, -size * 0.95, size * 0.86, size * 0.62],
    [-size * 0.52, -size * 0.55, size * 0.62, size * 0.5],
    [size * 0.52, -size * 0.55, size * 0.62, size * 0.5],
    [0, -size * 0.35, size * 0.78, size * 0.44],
  ];
  for (let i = 0; i < blobs.length; i++) {
    const b = blobs[i];
    g.ellipse(cx + b[0], baseY + b[1], b[2], b[3], cDark);
  }
  for (let i = 0; i < blobs.length; i++) {
    const b = blobs[i];
    g.ellipse(cx + b[0], baseY + b[1] - 1, b[2] - 1, b[3] - 1, cMid);
  }
  g.ellipse(cx - size * 0.3, baseY - size * 1.1, size * 0.42, size * 0.3, cLight);
  g.ellipse(cx + size * 0.35, baseY - size * 0.75, size * 0.26, size * 0.18, cLight);
  // ein paar Blattpunkte fuer Textur
  for (let i = 0; i < 16; i++) {
    const a = rng() * Math.PI * 2;
    const r = rng();
    g.rect(
      Math.round(cx + Math.cos(a) * size * 0.8 * r),
      Math.round(baseY - size * 0.75 + Math.sin(a) * size * 0.5 * r),
      1, 1, rng() < 0.5 ? cLight : cDark
    );
  }
}

export const PROPS = {
  tree_oak: p(34, 44, 17, 44, function (g) {
    g.ellipse(17, 42, 10, 3, PAL.shadow);
    g.rect(15, 28, 5, 15, PAL.bark);
    g.rect(15, 28, 2, 15, PAL.barkLight);
    g.rect(19, 30, 1, 13, PAL.barkDark);
    g.line(15, 32, 11, 27, PAL.bark, 2);
    g.line(20, 30, 24, 26, PAL.bark, 2);
    leafyCanopy(g, 17, 30, 13, PAL.leaf, PAL.leafDark, PAL.leafLight, 101);
  }),

  tree_pine: p(30, 48, 15, 48, function (g) {
    g.ellipse(15, 46, 9, 3, PAL.shadow);
    g.rect(13, 34, 4, 13, PAL.barkDark);
    g.rect(13, 34, 2, 13, PAL.bark);
    const tiers = [[36, 13, 7], [28, 11, 7], [20, 9, 6], [13, 6, 5]];
    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      g.poly([[15 - t[1], t[0]], [15 + t[1], t[0]], [15, t[0] - t[2] - 3]], PAL.pineDark);
      g.poly([[15 - t[1] + 2, t[0] - 1], [15 + t[1] - 2, t[0] - 1], [15, t[0] - t[2] - 1]], PAL.pine);
    }
    g.poly([[11, 14], [15, 14], [15, 5]], PAL.pine);
    g.rect(14, 4, 2, 3, PAL.pineDark);
  }),

  tree_birch: p(28, 44, 14, 44, function (g) {
    g.ellipse(14, 42, 8, 3, PAL.shadow);
    g.rect(12, 24, 4, 19, '#e4dfd2');
    g.rect(12, 24, 1, 19, '#f6f1e6');
    g.rect(15, 24, 1, 19, '#c2bcae');
    g.rect(12, 28, 3, 1, '#4a4438');
    g.rect(13, 34, 2, 1, '#4a4438');
    g.rect(12, 39, 2, 1, '#4a4438');
    leafyCanopy(g, 14, 26, 11, '#82b95f', '#5c9145', '#a7d67e', 707);
  }),

  tree_maple: p(32, 42, 16, 42, function (g) {
    g.ellipse(16, 40, 9, 3, PAL.shadow);
    g.rect(14, 27, 4, 14, PAL.bark);
    g.rect(14, 27, 2, 14, PAL.barkLight);
    leafyCanopy(g, 16, 29, 12, PAL.autumn, PAL.autumnDark, '#e8b45c', 313);
  }),

  tree_stump: p(20, 16, 10, 16, function (g) {
    g.ellipse(10, 14, 7, 2, PAL.shadow);
    g.rect(4, 6, 12, 8, PAL.barkDark);
    g.rect(4, 6, 12, 6, PAL.bark);
    g.ellipse(10, 6, 6, 3, PAL.barkLight);
    g.ellipse(10, 6, 3, 1, PAL.bark);
  }),

  log_barrier: p(38, 22, 19, 22, function (g) {
    g.ellipse(19, 20, 16, 3, PAL.shadow);
    g.rect(2, 8, 34, 10, PAL.barkDark);
    g.rect(2, 8, 34, 6, PAL.bark);
    g.rect(2, 8, 34, 2, PAL.barkLight);
    g.ellipse(3, 13, 2, 5, PAL.barkLight);
    g.ellipse(3, 13, 1, 3, PAL.bark);
    g.ellipse(35, 13, 2, 5, PAL.barkDark);
    for (let i = 0; i < 4; i++) g.rect(8 + i * 7, 11, 1, 5, PAL.barkDark);
    g.ellipse(10, 6, 5, 3, PAL.leafDark);
    g.ellipse(26, 6, 4, 3, PAL.leafDark);
  }),

  /* ---------- Steine ---------- */

  rock_big: p(26, 22, 13, 22, function (g) {
    g.ellipse(13, 20, 11, 3, PAL.shadow);
    g.poly([[2, 20], [5, 8], [12, 3], [21, 7], [24, 20]], PAL.stoneDark);
    g.poly([[4, 19], [7, 9], [12, 5], [19, 9], [21, 19]], PAL.stone);
    g.poly([[7, 14], [11, 6], [15, 9], [12, 15]], PAL.stoneLight);
    g.rect(16, 13, 3, 1, PAL.stoneDark);
  }),

  rock_small: p(18, 14, 9, 14, function (g) {
    g.ellipse(9, 13, 7, 2, PAL.shadow);
    g.poly([[2, 12], [4, 5], [10, 2], [15, 6], [16, 12]], PAL.stoneDark);
    g.poly([[4, 11], [6, 6], [10, 4], [13, 7], [14, 11]], PAL.stone);
    g.rect(6, 7, 3, 1, PAL.stoneLight);
  }),

  rock_ore: p(26, 22, 13, 22, function (g) {
    g.ellipse(13, 20, 11, 3, PAL.shadow);
    g.poly([[2, 20], [5, 8], [12, 3], [21, 7], [24, 20]], PAL.stoneDark);
    g.poly([[4, 19], [7, 9], [12, 5], [19, 9], [21, 19]], PAL.stone);
    g.circle(9, 11, 2, PAL.copper);
    g.circle(16, 15, 2, PAL.copper);
    g.circle(13, 8, 1, '#e8a05c');
    g.rect(9, 10, 1, 1, '#f0c08c');
    g.rect(16, 14, 1, 1, '#f0c08c');
  }),

  rockslide: p(40, 26, 20, 26, function (g) {
    g.ellipse(20, 24, 18, 3, PAL.shadow);
    g.poly([[2, 24], [6, 10], [16, 4], [26, 8], [34, 6], [38, 24]], PAL.stoneDark);
    g.poly([[5, 23], [9, 12], [16, 7], [24, 11], [32, 9], [35, 23]], PAL.stone);
    g.poly([[10, 18], [14, 10], [19, 13], [16, 20]], PAL.stoneLight);
    g.poly([[25, 20], [29, 13], [33, 16], [31, 22]], PAL.stoneLight);
    g.rect(20, 15, 4, 1, PAL.stoneDark);
  }),

  /* ---------- Kleinkram / Sammelbares ---------- */

  bush_berry: p(22, 18, 11, 18, function (g) {
    g.ellipse(11, 16, 9, 2, PAL.shadow);
    g.ellipse(11, 10, 9, 6, PAL.leafDark);
    g.ellipse(11, 9, 8, 5, PAL.leaf);
    g.ellipse(8, 7, 4, 2, PAL.leafLight);
    const spots = [[6, 10], [11, 12], [15, 9], [9, 13], [14, 13]];
    for (let i = 0; i < spots.length; i++) {
      g.circle(spots[i][0], spots[i][1], 1.6, PAL.berryDark);
      g.rect(spots[i][0] - 1, spots[i][1] - 1, 1, 1, PAL.berry);
    }
  }),

  bush_plain: p(22, 16, 11, 16, function (g) {
    g.ellipse(11, 14, 8, 2, PAL.shadow);
    g.ellipse(11, 9, 9, 5, PAL.leafDark);
    g.ellipse(11, 8, 8, 4, PAL.leaf);
    g.ellipse(8, 6, 3, 2, PAL.leafLight);
  }),

  grass_tuft: p(14, 10, 7, 10, function (g) {
    g.line(7, 9, 3, 2, PAL.grassLight, 1);
    g.line(7, 9, 7, 1, PAL.grassLight, 1);
    g.line(7, 9, 11, 3, PAL.grass, 1);
    g.line(7, 9, 10, 5, PAL.grassDark, 1);
  }),

  reeds: p(16, 22, 8, 22, function (g) {
    g.line(5, 21, 3, 6, '#6f9a52', 1);
    g.line(8, 21, 8, 3, '#7fae5c', 1);
    g.line(11, 21, 13, 7, '#6f9a52', 1);
    g.rect(7, 2, 2, 5, PAL.barkLight);
    g.rect(2, 5, 2, 4, PAL.bark);
    g.rect(12, 6, 2, 4, PAL.bark);
  }),

  flower_pink: p(12, 14, 6, 14, function (g) { flower(g, PAL.flowerA, '#f7a9b8'); }),
  flower_yellow: p(12, 14, 6, 14, function (g) { flower(g, PAL.flowerB, '#fbeda0'); }),
  flower_violet: p(12, 14, 6, 14, function (g) { flower(g, PAL.flowerC, '#c3aeee'); }),
  flower_white: p(12, 14, 6, 14, function (g) { flower(g, PAL.flowerD, '#ffffff'); }),

  mushroom: p(12, 12, 6, 12, function (g) {
    g.ellipse(6, 11, 4, 1, PAL.shadow);
    g.rect(5, 6, 2, 5, PAL.mushroomStem);
    g.ellipse(6, 5, 5, 3, '#a33b2c');
    g.ellipse(6, 4, 5, 3, PAL.mushroom);
    g.rect(4, 3, 1, 1, '#f6dccd');
    g.rect(8, 4, 1, 1, '#f6dccd');
    g.rect(6, 2, 1, 1, '#f6dccd');
  }),

  herb: p(12, 12, 6, 12, function (g) {
    g.line(6, 11, 6, 4, '#5d8f4a', 1);
    g.ellipse(3, 6, 2, 3, '#79ad5c');
    g.ellipse(9, 7, 2, 3, '#79ad5c');
    g.ellipse(6, 3, 2, 2, '#8ec06a');
  }),

  shell: p(12, 10, 6, 10, function (g) {
    g.ellipse(6, 8, 5, 1, PAL.shadow);
    g.poly([[1, 8], [6, 1], [11, 8]], '#f0d9c4');
    g.line(6, 2, 3, 8, '#d8b79b', 1);
    g.line(6, 2, 6, 8, '#d8b79b', 1);
    g.line(6, 2, 9, 8, '#d8b79b', 1);
  }),

  driftwood: p(20, 12, 10, 12, function (g) {
    g.ellipse(10, 10, 8, 2, PAL.shadow);
    g.rect(2, 5, 16, 4, '#a89073');
    g.rect(2, 5, 16, 2, '#c2ab8d');
    g.rect(5, 3, 4, 2, '#a89073');
    g.rect(12, 9, 4, 2, '#8c7259');
  }),

  digspot: p(16, 10, 8, 10, function (g) {
    g.ellipse(8, 6, 7, 3, PAL.dirtDark);
    g.ellipse(8, 5, 6, 2, PAL.dirt);
    g.rect(5, 4, 1, 1, PAL.dirtDark);
    g.rect(10, 5, 1, 1, PAL.dirtDark);
    g.rect(7, 2, 2, 1, '#a9855e');
  }),

  crate: p(18, 16, 9, 16, function (g) {
    g.ellipse(9, 15, 7, 2, PAL.shadow);
    g.rect(2, 3, 14, 12, PAL.woodDark);
    g.rect(3, 4, 12, 10, PAL.wood);
    g.line(3, 4, 14, 13, PAL.woodDark, 1);
    g.line(14, 4, 3, 13, PAL.woodDark, 1);
    g.frame(2, 3, 14, 12, PAL.barkDark);
  }),

  chest: p(20, 16, 10, 16, function (g) {
    g.ellipse(10, 15, 8, 2, PAL.shadow);
    g.rect(2, 6, 16, 9, PAL.woodDark);
    g.rect(2, 6, 16, 5, PAL.wood);
    g.ellipse(10, 6, 8, 4, PAL.wood);
    g.ellipse(10, 6, 8, 3, PAL.barkLight);
    g.rect(2, 9, 16, 1, PAL.gold);
    g.rect(9, 8, 2, 4, PAL.gold);
  }),

  /* ---------- Lager ---------- */

  campfire: p(30, 24, 15, 24, function (g) {
    g.ellipse(15, 21, 12, 4, PAL.shadow);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.ellipse(15 + Math.cos(a) * 11, 18 + Math.sin(a) * 4.5, 2.6, 2, PAL.stoneDark);
      g.ellipse(15 + Math.cos(a) * 11, 17.4 + Math.sin(a) * 4.5, 2.2, 1.6, PAL.stone);
    }
    g.line(8, 18, 21, 13, PAL.barkDark, 3);
    g.line(9, 13, 22, 18, PAL.bark, 3);
    g.rect(12, 15, 6, 2, '#3a2c20');
  }),

  flame_0: p(18, 22, 9, 22, function (g) { flame(g, 0); }),
  flame_1: p(18, 22, 9, 22, function (g) { flame(g, 1); }),
  flame_2: p(18, 22, 9, 22, function (g) { flame(g, 2); }),
  flame_3: p(18, 22, 9, 22, function (g) { flame(g, 3); }),

  tent: p(46, 40, 23, 40, function (g) {
    g.ellipse(23, 38, 19, 3, PAL.shadow);
    g.poly([[4, 37], [23, 5], [42, 37]], '#8d5b47');
    g.poly([[8, 37], [23, 8], [38, 37]], '#a86b52');
    g.poly([[17, 37], [23, 14], [29, 37]], '#3a2b26');
    g.poly([[19, 37], [23, 18], [27, 37]], '#20181a');
    g.line(23, 5, 23, 12, '#e0d6c4', 1);
    g.rect(21, 2, 4, 4, PAL.warm);
    g.line(4, 37, 1, 33, '#6d4a38', 1);
    g.line(42, 37, 45, 33, '#6d4a38', 1);
  }),

  stall: p(50, 40, 25, 40, function (g) {
    g.ellipse(25, 38, 21, 3, PAL.shadow);
    g.rect(4, 14, 3, 24, PAL.woodDark);
    g.rect(43, 14, 3, 24, PAL.woodDark);
    g.rect(6, 26, 38, 10, PAL.wood);
    g.rect(6, 26, 38, 3, PAL.barkLight);
    for (let i = 0; i < 6; i++) {
      g.rect(3 + i * 8, 10, 8, 8, i % 2 ? '#d9694f' : '#f0e0c8');
    }
    g.rect(3, 8, 44, 3, '#7d4a3a');
    g.poly([[3, 18], [11, 18], [7, 22]], '#d9694f');
    g.poly([[11, 18], [19, 18], [15, 22]], '#f0e0c8');
    g.poly([[19, 18], [27, 18], [23, 22]], '#d9694f');
    g.poly([[27, 18], [35, 18], [31, 22]], '#f0e0c8');
    g.poly([[35, 18], [43, 18], [39, 22]], '#d9694f');
    g.circle(14, 24, 2, PAL.flowerB);
    g.circle(34, 24, 2, PAL.flowerA);
  }),

  workbench: p(34, 26, 17, 26, function (g) {
    g.ellipse(17, 24, 14, 3, PAL.shadow);
    g.rect(3, 10, 28, 5, PAL.wood);
    g.rect(3, 10, 28, 2, PAL.barkLight);
    g.rect(5, 15, 3, 9, PAL.woodDark);
    g.rect(26, 15, 3, 9, PAL.woodDark);
    g.rect(10, 6, 3, 5, PAL.iron);
    g.rect(9, 4, 5, 3, PAL.barkDark);
    g.rect(18, 7, 8, 3, PAL.iron);
    g.rect(20, 4, 2, 4, PAL.wood);
  }),

  /* ---------- Deko ---------- */

  lantern: p(14, 28, 7, 28, function (g) {
    g.ellipse(7, 26, 5, 2, PAL.shadow);
    g.rect(6, 12, 2, 14, PAL.iron);
    g.rect(5, 25, 4, 2, '#6b7079');
    g.rect(3, 4, 8, 9, '#5a616b');
    g.rect(4, 5, 6, 7, PAL.emberCore);
    g.rect(5, 7, 4, 4, PAL.ember);
    g.rect(3, 2, 8, 2, '#6b7079');
    g.rect(6, 0, 2, 2, PAL.iron);
  }),

  bench: p(30, 20, 15, 20, function (g) {
    g.ellipse(15, 18, 12, 2, PAL.shadow);
    g.rect(3, 10, 24, 3, PAL.wood);
    g.rect(3, 10, 24, 1, PAL.barkLight);
    g.rect(4, 13, 3, 5, PAL.woodDark);
    g.rect(23, 13, 3, 5, PAL.woodDark);
    g.rect(4, 3, 3, 8, PAL.woodDark);
    g.rect(23, 3, 3, 8, PAL.woodDark);
    g.rect(4, 4, 22, 2, PAL.wood);
    g.rect(4, 7, 22, 2, PAL.wood);
  }),

  fence: p(18, 18, 9, 18, function (g) {
    g.ellipse(9, 16, 7, 2, PAL.shadow);
    g.rect(2, 4, 3, 12, PAL.wood);
    g.rect(13, 4, 3, 12, PAL.wood);
    g.poly([[2, 4], [5, 4], [3.5, 1]], PAL.barkLight);
    g.poly([[13, 4], [16, 4], [14.5, 1]], PAL.barkLight);
    g.rect(1, 7, 16, 2, PAL.barkLight);
    g.rect(1, 12, 16, 2, PAL.barkLight);
  }),

  flowerbed: p(24, 18, 12, 18, function (g) {
    g.ellipse(12, 16, 10, 2, PAL.shadow);
    g.rect(2, 8, 20, 8, PAL.woodDark);
    g.rect(3, 9, 18, 6, PAL.dirt);
    g.circle(6, 9, 2, PAL.flowerA);
    g.circle(12, 8, 2, PAL.flowerB);
    g.circle(18, 9, 2, PAL.flowerC);
    g.rect(6, 8, 1, 1, '#ffffff');
    g.rect(12, 7, 1, 1, '#ffffff');
  }),

  birdhouse: p(16, 30, 8, 30, function (g) {
    g.ellipse(8, 28, 5, 2, PAL.shadow);
    g.rect(7, 14, 2, 14, PAL.woodDark);
    g.rect(3, 6, 10, 9, PAL.wood);
    g.poly([[1, 7], [8, 1], [15, 7]], '#a8543f');
    g.circle(8, 10, 2, '#3a2b26');
    g.rect(7, 12, 2, 3, PAL.barkDark);
  }),

  windchime: p(14, 30, 7, 30, function (g) {
    g.rect(2, 2, 10, 2, PAL.wood);
    g.line(4, 4, 4, 14, PAL.iron, 1);
    g.line(7, 4, 7, 18, PAL.iron, 1);
    g.line(10, 4, 10, 12, PAL.iron, 1);
    g.rect(3, 14, 3, 6, PAL.copper);
    g.rect(6, 18, 3, 7, PAL.gold);
    g.rect(9, 12, 3, 5, PAL.copper);
  }),

  rug: p(28, 18, 14, 18, function (g) {
    g.ellipse(14, 14, 12, 5, '#8a4f5e');
    g.ellipse(14, 14, 10, 4, '#b06a76');
    g.ellipse(14, 14, 6, 2.4, '#e0c39a');
    g.ellipse(14, 14, 3, 1.2, '#8a4f5e');
  }),

  signpost: p(16, 24, 8, 24, function (g) {
    g.ellipse(8, 22, 5, 2, PAL.shadow);
    g.rect(7, 8, 2, 14, PAL.woodDark);
    g.rect(1, 4, 14, 7, PAL.wood);
    g.rect(1, 4, 14, 2, PAL.barkLight);
    g.rect(3, 7, 8, 1, PAL.barkDark);
    g.rect(3, 9, 5, 1, PAL.barkDark);
  }),

  bridge: p(16, 16, 8, 8, function (g) {
    g.rect(0, 0, 16, 16, '#a8804f');
    g.rect(0, 0, 16, 2, '#c29a68');
    for (let i = 0; i < 4; i++) g.rect(0, 3 + i * 4, 16, 1, '#7d5c37');
    g.rect(0, 0, 1, 16, '#7d5c37');
    g.rect(15, 0, 1, 16, '#7d5c37');
  }),

  path_tile: p(16, 16, 8, 8, function (g) {
    const rng = makeRng(4242);
    g.rect(0, 0, 16, 16, PAL.pathDark);
    g.ellipse(4, 4, 3.4, 3, PAL.path);
    g.ellipse(12, 5, 3.4, 3, PAL.path);
    g.ellipse(5, 12, 3.4, 3, PAL.path);
    g.ellipse(12, 12, 3.4, 3, PAL.path);
    g.speckle(0, 0, 16, 16, '#c9b48d', 10, rng);
  }),

  /* ---------- Erinnerungsstuecke (versteckte Aufgabengegenstaende) ---------- */

  memory_locket: p(14, 14, 7, 13, function (g) {
    g.circle(7, 8, 4, PAL.gold);
    g.circle(7, 8, 2.4, '#f6e2a0');
    g.rect(6, 2, 2, 3, PAL.gold);
    g.rect(5, 1, 4, 1, '#f6e2a0');
  }),

  memory_compass: p(14, 14, 7, 13, function (g) {
    g.circle(7, 8, 5, PAL.copper);
    g.circle(7, 8, 3.6, '#f0e5d0');
    g.line(5, 10, 9, 6, '#b6413a', 1);
    g.rect(6, 7, 2, 2, PAL.ink);
    g.rect(6, 1, 2, 2, PAL.copper);
  }),

  memory_music: p(14, 14, 7, 13, function (g) {
    g.rect(2, 6, 10, 7, PAL.wood);
    g.rect(2, 6, 10, 2, PAL.barkLight);
    g.rect(3, 8, 8, 4, '#8a5a80');
    g.rect(9, 3, 1, 4, PAL.gold);
    g.rect(7, 2, 3, 1, PAL.gold);
  }),

  memory_photo: p(14, 14, 7, 13, function (g) {
    g.rect(2, 3, 10, 10, '#efe6d4');
    g.rect(3, 4, 8, 6, '#7fa3b8');
    g.poly([[3, 10], [6, 6], [9, 10]], '#4f7a58');
    g.circle(9, 6, 1.2, '#f0d264');
  }),

  memory_ribbon: p(14, 14, 7, 13, function (g) {
    g.poly([[7, 8], [1, 4], [1, 10]], PAL.flowerA);
    g.poly([[7, 8], [13, 4], [13, 10]], PAL.flowerA);
    g.circle(7, 8, 1.8, '#f7a9b8');
    g.line(7, 9, 5, 13, PAL.flowerA, 1);
    g.line(7, 9, 9, 13, PAL.flowerA, 1);
  }),

  memory_teacup: p(14, 14, 7, 13, function (g) {
    g.ellipse(7, 12, 4, 1.4, '#d8d2c4');
    g.poly([[3, 6], [11, 6], [9, 12], [5, 12]], '#f2ece0');
    g.ellipse(7, 6, 4, 1.6, '#cfe3ef');
    g.line(11, 7, 13, 9, '#f2ece0', 1);
    g.line(13, 9, 11, 10, '#f2ece0', 1);
  }),

  /* ---------- Kleintiere ---------- */

  butterfly_0: p(10, 10, 5, 5, function (g) {
    g.ellipse(3, 4, 2.4, 3, '#e8a44c');
    g.ellipse(7, 4, 2.4, 3, '#e8a44c');
    g.rect(4, 3, 2, 4, '#4a3a2a');
  }),
  butterfly_1: p(10, 10, 5, 5, function (g) {
    g.ellipse(4, 4, 1.2, 3.2, '#d98f3c');
    g.ellipse(6, 4, 1.2, 3.2, '#d98f3c');
    g.rect(4, 3, 2, 4, '#4a3a2a');
  }),

  bird_0: p(12, 10, 6, 9, function (g) {
    g.ellipse(6, 6, 4, 3, '#6f8fa8');
    g.circle(9, 4, 2, '#7fa0ba');
    g.rect(10, 4, 2, 1, PAL.warm);
    g.poly([[2, 5], [6, 3], [5, 7]], '#5c7a92');
    g.rect(5, 9, 1, 1, PAL.warm);
    g.rect(7, 9, 1, 1, PAL.warm);
  }),
  bird_1: p(12, 10, 6, 9, function (g) {
    g.ellipse(6, 6, 4, 3, '#6f8fa8');
    g.circle(9, 4, 2, '#7fa0ba');
    g.rect(10, 4, 2, 1, PAL.warm);
    g.poly([[3, 1], [7, 4], [4, 6]], '#5c7a92');
    g.rect(5, 9, 1, 1, PAL.warm);
    g.rect(7, 9, 1, 1, PAL.warm);
  }),

  /* ---------- Werkzeuge in der Hand ---------- */

  tool_axe: p(14, 14, 3, 12, function (g) {
    g.line(3, 13, 6, 3, PAL.wood, 2);
    g.poly([[5, 4], [12, 1], [13, 6], [6, 7]], PAL.iron);
    g.poly([[10, 2], [13, 3], [13, 6], [10, 6]], '#d5dde6');
  }),

  tool_pickaxe: p(16, 14, 3, 12, function (g) {
    g.line(4, 13, 7, 3, PAL.wood, 2);
    g.poly([[1, 5], [7, 1], [14, 5], [7, 4]], PAL.iron);
    g.poly([[2, 5], [7, 2], [12, 5], [7, 3]], '#c4ccd6');
  }),

  tool_shovel: p(12, 15, 3, 13, function (g) {
    g.line(4, 14, 6, 4, PAL.wood, 2);
    g.rect(4, 1, 5, 4, PAL.iron);
    g.poly([[4, 4], [9, 4], [6.5, 8]], PAL.iron);
    g.rect(5, 2, 3, 2, '#c4ccd6');
  }),

  tool_rod: p(18, 16, 3, 14, function (g) {
    g.line(3, 15, 15, 2, PAL.wood, 2);
    g.rect(2, 12, 3, 4, PAL.barkDark);
    g.line(15, 2, 16, 10, '#e6eef2', 1);
    g.rect(15, 10, 2, 2, PAL.iron);
  }),

  tool_hand: p(10, 10, 5, 9, function (g) {
    g.ellipse(5, 5, 3, 3.4, PAL.skin);
    g.rect(4, 2, 1, 3, PAL.skin);
    g.rect(6, 2, 1, 3, PAL.skin);
  }),
};

function flower(g, petal, light) {
  g.line(6, 13, 6, 6, '#5d8f4a', 1);
  g.ellipse(3, 9, 2, 1.4, '#79ad5c');
  g.circle(6, 4, 2.8, petal);
  g.circle(6, 4, 1.2, light);
  g.rect(5, 2, 1, 1, light);
}

function flame(g, frame) {
  const wob = [0, 1, 0, -1][frame];
  const tall = [0, -1, -2, -1][frame];
  g.poly([[3, 21], [9 + wob, 4 + tall], [15, 21]], '#e05a26');
  g.poly([[5, 21], [9 + wob, 8 + tall], [13, 21]], PAL.ember);
  g.poly([[7, 21], [9 + wob, 13 + tall], [11, 21]], PAL.emberCore);
  g.rect(8 + wob, 2 + tall, 2, 2, '#ffe9b8');
}
