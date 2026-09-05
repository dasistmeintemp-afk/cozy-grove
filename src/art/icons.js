/** 16x16-Symbole fuer Gegenstaende und Oberflaeche. */
import { PAL } from './palette.js';

function fish(g, body, belly, fin) {
  g.ellipse(8, 8, 5.4, 3.2, body);
  g.ellipse(8, 9.5, 4.4, 1.6, belly);
  g.poly([[13, 8], [16, 4], [16, 12]], fin);
  g.poly([[7, 5], [10, 5], [8, 2]], fin);
  g.rect(4, 7, 1, 1, PAL.ink);
  g.rect(2, 7, 1, 2, belly);
}

function flowerIcon(g, petal, light) {
  g.line(8, 15, 8, 8, '#5d8f4a', 1);
  g.ellipse(5, 11, 2.2, 1.4, '#79ad5c');
  g.ellipse(11, 12, 2.2, 1.4, '#79ad5c');
  g.circle(8, 6, 3.6, petal);
  g.circle(8, 6, 1.6, light);
}

export const ICONS = {
  /* ----- Rohstoffe ----- */
  wood: function (g) {
    g.rect(1, 6, 14, 5, PAL.woodDark);
    g.rect(1, 6, 14, 3, PAL.wood);
    g.ellipse(2, 8.5, 1.6, 2.6, PAL.barkLight);
    g.ellipse(2, 8.5, 0.8, 1.4, PAL.wood);
    g.rect(5, 6, 1, 5, PAL.barkDark);
    g.rect(10, 6, 1, 5, PAL.barkDark);
  },
  hardwood: function (g) {
    g.rect(1, 4, 14, 4, '#6d4a30');
    g.rect(1, 4, 14, 2, '#8a6242');
    g.rect(2, 9, 12, 4, '#5c3d27');
    g.rect(2, 9, 12, 2, '#7a5638');
    g.ellipse(2, 6, 1.4, 2, '#a07a55');
  },
  stone: function (g) {
    g.poly([[2, 13], [4, 5], [9, 2], [14, 6], [13, 13]], PAL.stoneDark);
    g.poly([[4, 12], [6, 6], [9, 4], [12, 7], [11, 12]], PAL.stone);
    g.rect(6, 6, 2, 1, PAL.stoneLight);
  },
  copper_ore: function (g) {
    g.poly([[2, 13], [4, 5], [9, 2], [14, 6], [13, 13]], PAL.stoneDark);
    g.poly([[4, 12], [6, 6], [9, 4], [12, 7], [11, 12]], PAL.stone);
    g.circle(6, 8, 1.8, PAL.copper);
    g.circle(10, 10, 1.6, PAL.copper);
    g.rect(6, 7, 1, 1, '#f0c08c');
  },
  fiber: function (g) {
    g.line(8, 15, 3, 3, '#8ab35f', 1);
    g.line(8, 15, 8, 1, '#9cc46e', 1);
    g.line(8, 15, 13, 4, '#7ba354', 1);
    g.line(8, 15, 11, 8, '#6f9a52', 1);
  },
  resin: function (g) {
    g.poly([[8, 1], [12, 9], [8, 14], [4, 9]], '#e0a33c');
    g.poly([[8, 4], [10, 9], [8, 12], [6, 9]], '#f4cd76');
    g.rect(7, 6, 1, 2, '#fdf0c8');
  },
  clay: function (g) {
    g.ellipse(8, 11, 6, 3.4, '#a5644a');
    g.ellipse(8, 10, 5, 2.8, '#bd7a5c');
    g.ellipse(6, 8, 2, 1.4, '#d09675');
  },
  shell: function (g) {
    g.poly([[2, 13], [8, 2], [14, 13]], '#f0d9c4');
    g.line(8, 3, 4, 13, '#d8b79b', 1);
    g.line(8, 3, 8, 13, '#d8b79b', 1);
    g.line(8, 3, 12, 13, '#d8b79b', 1);
  },
  feather: function (g) {
    g.line(4, 14, 12, 2, '#e8eef2', 1);
    g.ellipse(9, 6, 3.4, 4.4, '#cfe0ea');
    g.line(4, 14, 12, 2, '#9db4c4', 1);
  },
  driftwood: function (g) {
    g.rect(1, 7, 14, 3, '#a89073');
    g.rect(1, 7, 14, 1, '#c2ab8d');
    g.rect(4, 5, 3, 2, '#a89073');
    g.rect(9, 10, 4, 2, '#8c7259');
  },

  /* ----- Sammelbares ----- */
  berry: function (g) {
    g.circle(5.5, 9, 3, PAL.berryDark);
    g.circle(10.5, 10, 2.6, PAL.berryDark);
    g.circle(8, 5.5, 2.8, PAL.berry);
    g.rect(4, 7, 1, 1, '#f0a0b8');
    g.rect(7, 4, 1, 1, '#f0a0b8');
    g.line(8, 3, 10, 1, PAL.leafDark, 1);
  },
  mushroom: function (g) {
    g.rect(6, 8, 4, 6, PAL.mushroomStem);
    g.ellipse(8, 7, 6, 3.4, '#a33b2c');
    g.ellipse(8, 6, 6, 3.4, PAL.mushroom);
    g.rect(5, 4, 2, 1, '#f6dccd');
    g.rect(10, 6, 1, 1, '#f6dccd');
  },
  herb: function (g) {
    g.line(8, 15, 8, 4, '#5d8f4a', 1);
    g.ellipse(4, 8, 2.6, 3.4, '#79ad5c');
    g.ellipse(12, 9, 2.6, 3.4, '#79ad5c');
    g.ellipse(8, 4, 2.4, 2.6, '#8ec06a');
  },
  flower_pink: function (g) { flowerIcon(g, PAL.flowerA, '#f7d0d8'); },
  flower_yellow: function (g) { flowerIcon(g, PAL.flowerB, '#fdf3c4'); },
  flower_violet: function (g) { flowerIcon(g, PAL.flowerC, '#ddd0f4'); },
  flower_white: function (g) { flowerIcon(g, '#e9f0f5', '#ffffff'); },

  /* ----- Ausgrabungen ----- */
  bone: function (g) {
    g.line(4, 12, 12, 4, PAL.bone, 3);
    g.circle(4, 12, 2.4, PAL.bone);
    g.circle(12, 4, 2.4, PAL.bone);
    g.circle(3, 10, 1.6, PAL.bone);
    g.circle(13, 6, 1.6, PAL.bone);
  },
  shard: function (g) {
    g.poly([[3, 13], [5, 4], [10, 2], [12, 9], [9, 14]], '#c98f6a');
    g.poly([[5, 12], [6, 6], [9, 5], [10, 9]], '#e0b08a');
    g.line(6, 6, 9, 12, '#a9714f', 1);
  },
  bottle: function (g) {
    g.rect(6, 1, 4, 4, PAL.glass);
    g.poly([[5, 5], [11, 5], [12, 9], [12, 14], [4, 14], [4, 9]], PAL.glass);
    g.poly([[6, 7], [8, 7], [8, 13], [6, 13]], '#d8f0f4');
    g.rect(6, 0, 4, 2, PAL.wood);
  },
  gem: function (g) {
    g.poly([[8, 1], [14, 6], [8, 15], [2, 6]], '#5fc4d6');
    g.poly([[8, 3], [11, 6], [8, 12], [5, 6]], '#a4e6f0');
    g.rect(7, 4, 1, 3, '#e8fbff');
  },
  coin_pouch: function (g) {
    g.ellipse(8, 10, 5.4, 4.4, '#a8794c');
    g.ellipse(8, 9, 4.4, 3.4, '#c4924f');
    g.rect(5, 4, 6, 2, '#8a5f38');
    g.circle(8, 10, 2, PAL.gold);
  },

  /* ----- Fische ----- */
  fish_sardine: function (g) { fish(g, '#9fb4c4', '#dfe9f0', '#7d94a6'); },
  fish_mackerel: function (g) { fish(g, '#5f8fa8', '#cfe3ef', '#43708a'); },
  fish_cod: function (g) { fish(g, '#a9977a', '#e4dbc4', '#87795f'); },
  fish_moonfish: function (g) { fish(g, '#b7a8e0', '#efe9ff', '#8d7cc4'); },
  fish_roach: function (g) { fish(g, '#8fa86f', '#dfe8c8', '#6f8a52'); },
  fish_trout: function (g) { fish(g, '#7c9c6a', '#e6dfc4', '#c9762c'); },
  fish_catfish: function (g) { fish(g, '#6b6152', '#c4b89c', '#4e463a'); },
  fish_goldcarp: function (g) { fish(g, '#e0a33c', '#f7e0a8', '#c9762c'); },

  /* ----- Erinnerungsstuecke ----- */
  memory_locket: function (g) {
    g.circle(8, 9, 5, PAL.gold);
    g.circle(8, 9, 3, '#f6e2a0');
    g.rect(7, 1, 2, 4, PAL.gold);
    g.rect(6, 0, 4, 1, '#f6e2a0');
  },
  memory_compass: function (g) {
    g.circle(8, 8, 6, PAL.copper);
    g.circle(8, 8, 4.4, '#f0e5d0');
    g.line(5, 11, 11, 5, '#b6413a', 1);
    g.rect(7, 7, 2, 2, PAL.ink);
  },
  memory_music: function (g) {
    g.rect(2, 6, 12, 8, PAL.wood);
    g.rect(2, 6, 12, 2, PAL.barkLight);
    g.rect(3, 9, 10, 4, '#8a5a80');
    g.rect(11, 2, 1, 5, PAL.gold);
    g.rect(9, 1, 3, 1, PAL.gold);
  },
  memory_photo: function (g) {
    g.rect(2, 2, 12, 12, '#efe6d4');
    g.rect(3, 3, 10, 8, '#7fa3b8');
    g.poly([[3, 11], [7, 6], [11, 11]], '#4f7a58');
    g.circle(10, 5, 1.4, '#f0d264');
  },
  memory_ribbon: function (g) {
    g.poly([[8, 8], [1, 3], [1, 11]], PAL.flowerA);
    g.poly([[8, 8], [15, 3], [15, 11]], PAL.flowerA);
    g.circle(8, 8, 2, '#f7a9b8');
    g.line(8, 10, 5, 15, PAL.flowerA, 1);
    g.line(8, 10, 11, 15, PAL.flowerA, 1);
  },
  memory_teacup: function (g) {
    g.ellipse(8, 14, 5, 1.6, '#d8d2c4');
    g.poly([[3, 5], [13, 5], [11, 13], [5, 13]], '#f2ece0');
    g.ellipse(8, 5, 5, 2, '#cfe3ef');
    g.line(13, 6, 15, 8, '#f2ece0', 1);
    g.line(15, 8, 13, 10, '#f2ece0', 1);
  },

  /* ----- Handwerk / Deko ----- */
  lantern: function (g) {
    g.rect(4, 3, 8, 9, '#5a616b');
    g.rect(5, 4, 6, 7, PAL.emberCore);
    g.rect(6, 6, 4, 4, PAL.ember);
    g.rect(4, 1, 8, 2, '#6b7079');
    g.rect(7, 12, 2, 3, PAL.iron);
    g.rect(5, 14, 6, 2, '#6b7079');
  },
  bench: function (g) {
    g.rect(1, 8, 14, 2, PAL.wood);
    g.rect(2, 10, 2, 4, PAL.woodDark);
    g.rect(12, 10, 2, 4, PAL.woodDark);
    g.rect(2, 2, 2, 6, PAL.woodDark);
    g.rect(12, 2, 2, 6, PAL.woodDark);
    g.rect(2, 3, 12, 2, PAL.wood);
    g.rect(2, 6, 12, 1, PAL.wood);
  },
  fence: function (g) {
    g.rect(2, 3, 3, 11, PAL.wood);
    g.rect(11, 3, 3, 11, PAL.wood);
    g.poly([[2, 3], [5, 3], [3.5, 0]], PAL.barkLight);
    g.poly([[11, 3], [14, 3], [12.5, 0]], PAL.barkLight);
    g.rect(1, 6, 14, 2, PAL.barkLight);
    g.rect(1, 10, 14, 2, PAL.barkLight);
  },
  flowerbed: function (g) {
    g.rect(1, 6, 14, 8, PAL.woodDark);
    g.rect(2, 7, 12, 6, PAL.dirt);
    g.circle(5, 7, 2, PAL.flowerA);
    g.circle(9, 6, 2, PAL.flowerB);
    g.circle(12, 8, 2, PAL.flowerC);
  },
  birdhouse: function (g) {
    g.rect(7, 10, 2, 6, PAL.woodDark);
    g.rect(3, 4, 10, 8, PAL.wood);
    g.poly([[1, 5], [8, 0], [15, 5]], '#a8543f');
    g.circle(8, 8, 2, '#3a2b26');
  },
  windchime: function (g) {
    g.rect(3, 1, 10, 2, PAL.wood);
    g.line(5, 3, 5, 8, PAL.iron, 1);
    g.line(8, 3, 8, 10, PAL.iron, 1);
    g.line(11, 3, 11, 7, PAL.iron, 1);
    g.rect(4, 8, 3, 5, PAL.copper);
    g.rect(7, 10, 3, 5, PAL.gold);
    g.rect(10, 7, 3, 4, PAL.copper);
  },
  rug: function (g) {
    g.ellipse(8, 8, 7, 4.6, '#8a4f5e');
    g.ellipse(8, 8, 5.6, 3.6, '#b06a76');
    g.ellipse(8, 8, 3, 2, '#e0c39a');
  },
  path_tile: function (g) {
    g.rect(1, 3, 14, 10, PAL.pathDark);
    g.ellipse(5, 6, 3, 2.4, PAL.path);
    g.ellipse(11, 6, 3, 2.4, PAL.path);
    g.ellipse(5, 11, 3, 2.4, PAL.path);
    g.ellipse(11, 11, 3, 2.4, PAL.path);
  },
  bridge_kit: function (g) {
    g.rect(1, 4, 14, 8, '#a8804f');
    g.rect(1, 4, 14, 1, '#c29a68');
    g.rect(1, 7, 14, 1, '#7d5c37');
    g.rect(1, 10, 14, 1, '#7d5c37');
    g.rect(2, 2, 2, 12, PAL.woodDark);
    g.rect(12, 2, 2, 12, PAL.woodDark);
  },
  signpost: function (g) {
    g.rect(7, 8, 2, 8, PAL.woodDark);
    g.rect(1, 3, 14, 6, PAL.wood);
    g.rect(1, 3, 14, 2, PAL.barkLight);
    g.rect(3, 6, 8, 1, PAL.barkDark);
  },

  /* ----- Waehrungen & Zustaende ----- */
  ember: function (g) {
    g.poly([[8, 1], [13, 9], [8, 15], [3, 9]], '#e05a26');
    g.poly([[8, 4], [11, 9], [8, 13], [5, 9]], PAL.ember);
    g.poly([[8, 7], [9.6, 10], [8, 12], [6.4, 10]], PAL.emberCore);
  },
  coin: function (g) {
    g.circle(8, 8, 6, '#b8912f');
    g.circle(8, 8, 5, PAL.gold);
    g.circle(8, 8, 3, '#f2dc8e');
    g.rect(7, 5, 2, 6, '#b8912f');
    g.rect(5, 7, 6, 2, '#b8912f');
  },
  heart: function (g) {
    g.circle(5.5, 6, 3, '#d95d72');
    g.circle(10.5, 6, 3, '#d95d72');
    g.poly([[2, 7], [14, 7], [8, 14]], '#d95d72');
    g.circle(5, 5, 1, '#f0a0b0');
  },
  color: function (g) {
    g.circle(8, 8, 6.4, '#6b7078');
    g.poly([[8, 2], [14, 8], [8, 14]], PAL.leaf);
    g.poly([[8, 2], [8, 14], [2, 8]], '#9aa0a8');
    g.circle(8, 8, 2, PAL.warm);
  },

  /* ----- Werkzeuge ----- */
  axe: function (g) {
    g.line(3, 15, 8, 3, PAL.wood, 2);
    g.poly([[6, 4], [14, 1], [15, 7], [7, 8]], PAL.iron);
    g.poly([[12, 2], [15, 3], [15, 7], [12, 7]], '#d5dde6');
  },
  pickaxe: function (g) {
    g.line(6, 15, 8, 4, PAL.wood, 2);
    g.poly([[1, 6], [8, 1], [15, 6], [8, 5]], PAL.iron);
    g.poly([[3, 6], [8, 2], [13, 6], [8, 4]], '#c4ccd6');
  },
  shovel: function (g) {
    g.line(7, 14, 8, 4, PAL.wood, 2);
    g.rect(5, 0, 6, 2, PAL.wood);
    g.rect(5, 8, 6, 4, PAL.iron);
    g.poly([[5, 11], [11, 11], [8, 15]], PAL.iron);
    g.rect(6, 9, 3, 2, '#c4ccd6');
  },
  rod: function (g) {
    g.line(2, 15, 13, 2, PAL.wood, 2);
    g.rect(1, 12, 3, 4, PAL.barkDark);
    g.line(13, 2, 14, 11, '#e6eef2', 1);
    g.rect(13, 11, 2, 2, PAL.iron);
  },
  hand: function (g) {
    g.ellipse(8, 9, 4, 4.6, PAL.skin);
    g.rect(5, 3, 2, 5, PAL.skin);
    g.rect(8, 2, 2, 6, PAL.skin);
    g.rect(11, 4, 2, 4, PAL.skin);
  },

  /* ----- Oberflaechen-Symbole ----- */
  day: function (g) {
    g.circle(8, 8, 4.4, PAL.warm);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.rect(8 + Math.cos(a) * 6.4 - 0.5, 8 + Math.sin(a) * 6.4 - 0.5, 1.6, 1.6, PAL.warm);
    }
  },
  clock: function (g) {
    g.circle(8, 8, 6.4, '#cfe3ef');
    g.circle(8, 8, 5.2, '#2c3742');
    g.line(8, 8, 8, 4, '#cfe3ef', 1);
    g.line(8, 8, 11, 9, '#cfe3ef', 1);
  },
  quest: function (g) {
    g.rect(3, 1, 10, 14, '#efe6d4');
    g.rect(3, 1, 10, 2, PAL.warm);
    g.rect(5, 5, 6, 1, '#8a7f6d');
    g.rect(5, 8, 6, 1, '#8a7f6d');
    g.rect(5, 11, 4, 1, '#8a7f6d');
  },
  bag: function (g) {
    g.poly([[3, 5], [13, 5], [14, 15], [2, 15]], '#a8794c');
    g.poly([[4, 6], [12, 6], [13, 14], [3, 14]], '#c4924f');
    g.line(5, 5, 6, 1, '#8a5f38', 1);
    g.line(11, 5, 10, 1, '#8a5f38', 1);
    g.rect(6, 1, 4, 1, '#8a5f38');
  },
  craft: function (g) {
    g.line(2, 14, 10, 4, PAL.wood, 2);
    g.rect(8, 1, 6, 4, PAL.iron);
    g.rect(9, 2, 4, 2, '#c4ccd6');
    g.circle(4, 12, 2, PAL.stone);
  },
  map: function (g) {
    g.poly([[1, 3], [6, 1], [10, 3], [15, 1], [15, 13], [10, 15], [6, 13], [1, 15]], '#e8dcc0');
    g.line(6, 1, 6, 13, '#b8a888', 1);
    g.line(10, 3, 10, 15, '#b8a888', 1);
    g.line(3, 10, 8, 6, '#c9762c', 1);
    g.rect(12, 8, 2, 2, '#c9762c');
  },
  gear: function (g) {
    g.circle(8, 8, 6, '#8f98a4');
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.rect(8 + Math.cos(a) * 6.6 - 1, 8 + Math.sin(a) * 6.6 - 1, 2.4, 2.4, '#8f98a4');
    }
    g.circle(8, 8, 2.4, '#2c3742');
  },
  check: function (g) {
    g.line(2, 8, 6, 13, PAL.leafLight, 2);
    g.line(6, 13, 14, 3, PAL.leafLight, 2);
  },
  lock: function (g) {
    g.rect(3, 7, 10, 8, '#8f98a4');
    g.rect(4, 8, 8, 6, '#b4bcc6');
    g.frame(5, 2, 6, 6, '#8f98a4');
    g.rect(7, 10, 2, 3, '#4a525c');
  },
  star: function (g) {
    g.poly([[8, 1], [10, 6], [15, 6], [11, 9], [13, 15], [8, 11], [3, 15], [5, 9], [1, 6], [6, 6]], PAL.gold);
    g.poly([[8, 4], [9.4, 7], [12, 7], [10, 9], [8, 8.6], [6, 9], [4, 7], [6.6, 7]], '#f6e2a0');
  },
  sparkle: function (g) {
    g.poly([[8, 0], [10, 6], [16, 8], [10, 10], [8, 16], [6, 10], [0, 8], [6, 6]], '#f6f1e6');
    g.circle(8, 8, 2, '#ffffff');
  },
  ghost: function (g) {
    g.ellipse(8, 7, 5.4, 5.4, PAL.ghost);
    g.poly([[3, 8], [13, 8], [13, 14], [11, 12], [9, 14], [7, 12], [5, 14], [3, 12]], PAL.ghost);
    g.rect(6, 6, 1, 2, '#3a4550');
    g.rect(10, 6, 1, 2, '#3a4550');
  },
  campfire: function (g) {
    g.line(2, 14, 14, 10, PAL.barkDark, 2);
    g.line(2, 10, 14, 14, PAL.bark, 2);
    g.poly([[4, 10], [8, 1], [12, 10]], '#e05a26');
    g.poly([[6, 10], [8, 4], [10, 10]], PAL.emberCore);
  },
  arrow: function (g) {
    g.poly([[8, 1], [14, 9], [10, 9], [10, 15], [6, 15], [6, 9], [2, 9]], PAL.warm);
  },
};
