/** Figuren: Spielfigur, Geister und der Haendler. */
import { PAL } from './palette.js';

const SKIN = ['#e9c6a0', '#c99a72', '#8d5f43', '#f2d8bb'];

/* ---------------- Spielfigur ---------------- */

const OUTFIT = {
  hat: '#c9762c',
  hatDark: '#a1541c',
  shirt: '#4f6d8f',
  shirtDark: '#3d566f',
  pants: '#5b4a38',
  pantsDark: '#463829',
  boots: '#3a2f24',
  hair: '#4a3527',
};

function paintScout(g, dir, frame, skinIdx) {
  const skin = SKIN[skinIdx % SKIN.length];
  const skinDark = SKIN[(skinIdx + 1) % SKIN.length];
  const o = OUTFIT;
  // Beinversatz je Laufbild
  const legA = frame === 1 ? 1 : 0;
  const legB = frame === 2 ? 1 : 0;
  const bob = frame === 0 ? 0 : -1;

  // Beine
  g.rect(6, 20 + legA + bob, 3, 5 - legA, o.pants);
  g.rect(10, 20 + legB + bob, 3, 5 - legB, o.pantsDark);
  g.rect(6, 24 + bob, 3, 2, o.boots);
  g.rect(10, 24 + bob, 3, 2, o.boots);

  // Rumpf
  g.rect(5, 12 + bob, 9, 9, o.shirt);
  g.rect(5, 12 + bob, 9, 2, o.shirtDark);
  if (dir !== 'up') g.rect(8, 15 + bob, 3, 5, o.shirtDark);

  // Arme
  const armY = 13 + bob;
  g.rect(3, armY + legB, 2, 6, o.shirtDark);
  g.rect(14, armY + legA, 2, 6, o.shirtDark);
  g.rect(3, armY + 6 + legB, 2, 2, skin);
  g.rect(14, armY + 6 + legA, 2, 2, skin);

  // Kopf
  g.ellipse(9, 7 + bob, 5, 5.4, skin);
  if (dir === 'up') {
    g.ellipse(9, 6 + bob, 5, 4.4, o.hair);
  } else if (dir === 'side') {
    g.ellipse(8, 5 + bob, 5, 3.4, o.hair);
    g.rect(12, 7 + bob, 2, 2, skinDark);
    g.rect(11, 7 + bob, 1, 2, PAL.ink);
  } else {
    g.ellipse(9, 4 + bob, 5, 3, o.hair);
    g.rect(7, 7 + bob, 1, 2, PAL.ink);
    g.rect(11, 7 + bob, 1, 2, PAL.ink);
    g.rect(8, 10 + bob, 3, 1, skinDark);
  }

  // Hut
  g.ellipse(9, 4 + bob, 7, 2.2, o.hatDark);
  g.ellipse(9, 2 + bob, 4.4, 2.6, o.hat);
  g.rect(5, 3 + bob, 8, 1, o.hatDark);
  if (dir !== 'up') g.rect(11, 1 + bob, 2, 1, PAL.warm);

  // Rucksack (von hinten sichtbar)
  if (dir === 'up') {
    g.rect(5, 13 + bob, 9, 7, '#8a5f38');
    g.rect(5, 13 + bob, 9, 2, '#a8794c');
    g.rect(8, 15 + bob, 3, 4, '#6d4a2c');
  }
}

/* ---------------- Geister ---------------- */

/**
 * @param {object} cfg fur, furDark, accent, ears, hat
 */
function paintSpirit(g, cfg, frame) {
  const bob = frame === 1 ? -1 : 0;
  const fur = cfg.fur;
  const dark = cfg.furDark;
  const light = cfg.furLight || fur;

  // Schweif als Geisterschwaden
  g.poly([
    [4, 20 + bob], [18, 20 + bob], [19, 27 + bob],
    [16, 25 + bob], [13, 28 + bob], [10, 25 + bob], [7, 28 + bob], [3, 25 + bob],
  ], dark);
  g.poly([
    [5, 20 + bob], [17, 20 + bob], [17, 25 + bob],
    [14, 24 + bob], [11, 26 + bob], [8, 24 + bob], [4, 24 + bob],
  ], fur);

  // Rumpf
  g.ellipse(11, 17 + bob, 7, 6, dark);
  g.ellipse(11, 16.5 + bob, 6.4, 5.4, fur);
  g.ellipse(11, 18 + bob, 3.4, 3, light);

  // Ohren
  if (cfg.ears === 'long') {
    g.ellipse(7, 3 + bob, 1.8, 4.4, dark);
    g.ellipse(15, 3 + bob, 1.8, 4.4, dark);
    g.ellipse(7, 3.5 + bob, 1, 3, cfg.accent);
    g.ellipse(15, 3.5 + bob, 1, 3, cfg.accent);
  } else if (cfg.ears === 'pointed') {
    g.poly([[4, 9 + bob], [7, 1 + bob], [10, 8 + bob]], dark);
    g.poly([[12, 8 + bob], [15, 1 + bob], [18, 9 + bob]], dark);
    g.poly([[6, 8 + bob], [7.5, 3 + bob], [9, 8 + bob]], cfg.accent);
    g.poly([[13, 8 + bob], [14.5, 3 + bob], [16, 8 + bob]], cfg.accent);
  } else {
    g.circle(5.5, 6 + bob, 2.8, dark);
    g.circle(16.5, 6 + bob, 2.8, dark);
    g.circle(5.5, 6 + bob, 1.4, cfg.accent);
    g.circle(16.5, 6 + bob, 1.4, cfg.accent);
  }

  // Kopf
  g.ellipse(11, 9 + bob, 6.6, 6, dark);
  g.ellipse(11, 8.6 + bob, 6, 5.4, fur);
  g.ellipse(11, 11 + bob, 3.4, 2.4, light);
  g.ellipse(11, 11 + bob, 1.4, 1, dark);

  // Augen
  if (frame === 1 && cfg.blink) {
    g.rect(7, 9 + bob, 2, 1, PAL.ink);
    g.rect(13, 9 + bob, 2, 1, PAL.ink);
  } else {
    g.rect(7, 8 + bob, 2, 2, PAL.ink);
    g.rect(13, 8 + bob, 2, 2, PAL.ink);
    g.rect(7, 8 + bob, 1, 1, PAL.white);
    g.rect(13, 8 + bob, 1, 1, PAL.white);
  }

  // Zubehoer
  if (cfg.hat === 'scarf') {
    g.rect(5, 14 + bob, 12, 2, cfg.accent);
    g.rect(7, 16 + bob, 3, 4, cfg.accent);
  } else if (cfg.hat === 'flowers') {
    g.circle(6, 4 + bob, 1.8, PAL.flowerA);
    g.circle(11, 2.4 + bob, 1.8, PAL.flowerB);
    g.circle(16, 4 + bob, 1.8, PAL.flowerC);
  } else if (cfg.hat === 'cap') {
    g.ellipse(11, 4 + bob, 7, 2, cfg.accent);
    g.ellipse(11, 2.6 + bob, 4.4, 2.2, cfg.accent);
    g.rect(11, 4 + bob, 7, 1, cfg.accent);
  } else if (cfg.hat === 'glasses') {
    g.frame(5, 7 + bob, 5, 4, cfg.accent);
    g.frame(12, 7 + bob, 5, 4, cfg.accent);
    g.rect(10, 8 + bob, 2, 1, cfg.accent);
  } else if (cfg.hat === 'bow') {
    g.poly([[11, 3 + bob], [7, 1 + bob], [7, 5 + bob]], cfg.accent);
    g.poly([[11, 3 + bob], [15, 1 + bob], [15, 5 + bob]], cfg.accent);
    g.circle(11, 3 + bob, 1.2, cfg.accent);
  }
}

function paintFlameSpirit(g, frame) {
  const bob = frame === 1 ? -1 : 0;
  g.poly([[4, 26 + bob], [11, 3 + bob], [18, 26 + bob]], '#d9491f');
  g.poly([[6, 26 + bob], [11, 7 + bob], [16, 26 + bob]], PAL.ember);
  g.poly([[8, 26 + bob], [11, 13 + bob], [14, 26 + bob]], PAL.emberCore);
  g.rect(8, 14 + bob, 2, 2, PAL.ink);
  g.rect(12, 14 + bob, 2, 2, PAL.ink);
  g.rect(8, 14 + bob, 1, 1, PAL.white);
  g.rect(12, 14 + bob, 1, 1, PAL.white);
  g.ellipse(11, 19 + bob, 2, 1.2, '#c04a1c');
  if (frame === 1) g.rect(10, 1, 2, 2, '#ffe9b8');
}

function paintFox(g, frame) {
  const bob = frame === 1 ? -1 : 0;
  const fur = '#d1793a';
  const dark = '#a85a26';
  const light = '#f0e0c8';
  // Schwanz
  g.ellipse(3, 18 + bob, 3.4, 5, fur);
  g.ellipse(2.5, 14 + bob, 2.4, 2.4, light);
  // Beine
  g.rect(7, 21 + bob, 3, 4, dark);
  g.rect(13, 21 + bob, 3, 4, dark);
  // Rumpf
  g.ellipse(11, 17 + bob, 6, 5.4, fur);
  g.ellipse(11, 19 + bob, 4, 3, light);
  // Weste
  g.rect(6, 14 + bob, 10, 4, '#4f6d8f');
  g.rect(10, 14 + bob, 2, 6, '#3d566f');
  // Kopf
  g.ellipse(11, 9 + bob, 5.4, 4.6, fur);
  g.poly([[6, 8 + bob], [8, 1 + bob], [10, 7 + bob]], fur);
  g.poly([[12, 7 + bob], [14, 1 + bob], [16, 8 + bob]], fur);
  g.poly([[7.5, 7 + bob], [8.4, 3.5 + bob], [9.4, 7 + bob]], '#e8b49c');
  g.poly([[12.6, 7 + bob], [13.6, 3.5 + bob], [14.5, 7 + bob]], '#e8b49c');
  g.ellipse(11, 12 + bob, 3.4, 2.4, light);
  g.rect(10, 12 + bob, 2, 1.4, PAL.ink);
  g.rect(8, 8 + bob, 2, 2, PAL.ink);
  g.rect(13, 8 + bob, 2, 2, PAL.ink);
  g.rect(8, 8 + bob, 1, 1, PAL.white);
  g.rect(13, 8 + bob, 1, 1, PAL.white);
}

/** Aussehen der Geister – bewusst wenige, dafuer klar unterscheidbar. */
export const SPIRIT_LOOKS = {
  bruno: { fur: '#7d6247', furDark: '#5c4733', furLight: '#a08663', accent: '#b6413a', ears: 'round', hat: 'scarf', blink: true },
  mira: { fur: '#8fa87f', furDark: '#6b8a5e', furLight: '#b4c8a0', accent: '#e4657f', ears: 'long', hat: 'flowers', blink: true },
  kiesel: { fur: '#8f9aa8', furDark: '#6d7784', furLight: '#b4bfcc', accent: '#3f6f9c', ears: 'round', hat: 'cap', blink: false },
  nelly: { fur: '#b8a4cc', furDark: '#9482ab', furLight: '#d6c8e4', accent: '#f0d264', ears: 'long', hat: 'bow', blink: true },
  tobi: { fur: '#c9a05c', furDark: '#a37f42', furLight: '#e0c48c', accent: '#4f6d8f', ears: 'pointed', hat: 'glasses', blink: true },
};

export function buildCritters(define) {
  const dirs = ['down', 'up', 'side'];
  for (let d = 0; d < dirs.length; d++) {
    for (let f = 0; f < 3; f++) {
      const dir = dirs[d];
      const frame = f;
      define('player_' + dir + '_' + frame, 18, 27, 9, 26, function (g) {
        paintScout(g, dir, frame, 0);
      });
    }
  }

  for (const id in SPIRIT_LOOKS) {
    const cfg = SPIRIT_LOOKS[id];
    for (let f = 0; f < 2; f++) {
      const frame = f;
      define('spirit_' + id + '_' + frame, 22, 30, 11, 28, function (g) {
        paintSpirit(g, cfg, frame);
      });
    }
  }

  define('spirit_flamey_0', 22, 30, 11, 28, function (g) { paintFlameSpirit(g, 0); });
  define('spirit_flamey_1', 22, 30, 11, 28, function (g) { paintFlameSpirit(g, 1); });

  define('fox_0', 22, 28, 11, 26, function (g) { paintFox(g, 0); });
  define('fox_1', 22, 28, 11, 26, function (g) { paintFox(g, 1); });
}
