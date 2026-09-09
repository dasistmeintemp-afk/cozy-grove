/**
 * Sprite-Register.
 *
 * Jede Grafik wird beim Start gemalt – einmal koloriert, einmal als blasse
 * Zeichnung. Die Zeichnung ist der Ausgangszustand der Insel; Farbe kommt
 * erst zurück, wenn Geister zufrieden sind.
 */
import { makeCanvas, ctx2d } from '../core/util.js';
import { INK } from './painted.js';
import {
  paintTree, paintPine, paintStump, paintLogBarrier,
  paintRock, paintRockslide, paintBush, paintFlower, paintGrassTuft,
  paintReeds, paintMushroom, paintHerb, paintShell, paintDriftwood, paintDigspot,
  paintMoonflower, paintRainmushroom, paintFogcrystal,
  paintCrop, paintSeedPouch,
} from './painted.js';
import {
  paintCampfire, paintFlame, paintTent, paintStall, paintWorkbench, paintBoat, paintMailbox,
  paintHouse,
  paintLantern, paintBench, paintFence, paintFlowerbed, paintBirdhouse,
  paintWindchime, paintRug, paintSignpost, paintCrate, paintChest,
  paintMemory, paintTool, paintButterfly, paintBird,
  paintSeli, paintSpirit, paintFlameSpirit, paintFox,
} from './painted-camp.js';
import { ICON_PAINTERS, paintFishIcon, iconFromArt } from './painted-icons.js';
import { paintGroundDecal } from './painted-ground.js';
import { BUGS, MEMORY_KINDS } from '../game/items.js';
import { CROPS, CROP_IDS } from '../game/crops.js';
import { TOOL_ART } from '../game/player.js';

/**
 * Die Maler arbeiten in bequemen Maßen; beim Ablegen wird alles einmal
 * herunterskaliert. Dadurch stimmen die Größenverhältnisse zur Kachel und
 * die Tuschelinien werden zugleich feiner.
 */
export const ART_SCALE = 1;

const registry = Object.create(null);
const iconUrlCache = Object.create(null);
let ready = false;

/** Aussehen der Geister – wenige, dafür klar unterscheidbar. */
export const SPIRIT_LOOKS = {
  bruno: { fur: '#d9c9a8', furShade: '#b8a37c', accent: '#c25a4a', ears: 'round', hat: 'scarf', blink: true },
  mira: { fur: '#cfdcb4', furShade: '#a8bd88', accent: '#e08aa0', ears: 'long', hat: 'flowers', blink: true },
  kiesel: { fur: '#d5dbdc', furShade: '#adb8ba', accent: '#4f86a8', ears: 'round', hat: 'cap', blink: false },
  nelly: { fur: '#ded2e6', furShade: '#b9a9c6', accent: '#e8c34c', ears: 'long', hat: 'bow', blink: true },
  tobi: { fur: '#ecdcb8', furShade: '#c8b48c', accent: '#5b8c9a', ears: 'pointed', hat: 'glasses', blink: true },
  wanda: { fur: '#c6d9d6', furShade: '#9db8b4', accent: '#e2a24c', ears: 'long', hat: 'scarf', blink: true },
};

/** Legt eine gemalte Grafik ab und skaliert sie auf Spielgröße. */
export function addArt(name, art, scale) {
  const s = scale == null ? ART_SCALE : scale;
  const w = Math.max(1, Math.round(art.w * s));
  const h = Math.max(1, Math.round(art.h * s));

  function shrink(src) {
    if (s === 1) return src;
    const c = makeCanvas(w, h);
    const ctx = ctx2d(c);
    ctx.imageSmoothingEnabled = true;
    if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, w, h);
    return c;
  }

  const entry = {
    name: name,
    c: shrink(art.color),
    g: shrink(art.line),
    w: w,
    h: h,
    ax: art.ax * s,
    ay: art.ay * s,
  };
  registry[name] = entry;
  return entry;
}

export function spr(name) {
  let s = registry[name];
  // Ein Name ohne Fassungsnummer trifft die erste Fassung. Damit laufen
  // ältere Spielstände weiter, in denen Bäume noch nur einen Namen hatten.
  if (!s && name) s = registry[name + '_0'];
  if (!s) {
    if (!spr._warned) spr._warned = Object.create(null);
    if (!spr._warned[name]) {
      spr._warned[name] = true;
      console.warn('Unbekanntes Sprite:', name);
    }
    return null;
  }
  return s;
}

export function hasSprite(name) {
  return !!registry[name];
}

export function spriteNames() {
  return Object.keys(registry);
}

/**
 * Zeichnet ein Sprite an Weltposition (Fußpunkt).
 * @param {boolean} line blasse Zeichnung statt kolorierter Fassung
 */
export function drawSprite(ctx, name, x, y, line, opts) {
  const s = registry[name];
  if (!s) return;
  const o = opts || {};
  const img = line ? s.g : s.c;
  const px = x - s.ax;
  const py = y - s.ay;

  if (!o.flip && !o.rotate && o.alpha == null && !o.scale) {
    ctx.drawImage(img, px, py);
    return;
  }
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  if (o.rotate) {
    ctx.translate(x, y);
    ctx.rotate(o.rotate);
    ctx.scale(o.flip ? -1 : 1, 1);
    ctx.drawImage(img, -s.ax, -s.ay);
  } else if (o.flip) {
    ctx.translate(x, py);
    ctx.scale(-1, 1);
    ctx.drawImage(img, -(s.w - s.ax), 0);
  } else {
    const sc = o.scale || 1;
    ctx.drawImage(img, px, py, s.w * sc, s.h * sc);
  }
  ctx.restore();
}

/** data-URL für DOM-Symbole (HUD, Fenster). */
export function iconUrl(name) {
  if (iconUrlCache[name] != null) return iconUrlCache[name];
  const s = registry[name];
  if (!s) return '';
  let url = '';
  try {
    url = s.c.toDataURL('image/png');
  } catch (err) {
    url = '';
  }
  iconUrlCache[name] = url;
  return url;
}

export function applyIcon(el, name) {
  const url = iconUrl(name);
  if (url) el.style.backgroundImage = 'url(' + url + ')';
}

export function isArtReady() {
  return ready;
}

/* ------------------------------------------------------------------ Aufbau */

const FISH_COLORS = {
  fish_sardine: ['#b6c4cf', '#eef3f6', '#93a5b2'],
  fish_mackerel: ['#6e9cb4', '#dcecf2', '#4d7b93'],
  fish_cod: ['#bda986', '#f0e6cd', '#98866a'],
  fish_moonfish: ['#c3b4e6', '#f2ecff', '#9a89c8'],
  fish_roach: ['#a3b884', '#e8eed4', '#7d9463'],
  fish_trout: ['#8fae76', '#eee6cb', '#d1873c'],
  fish_catfish: ['#7d7263', '#cfc4ab', '#5b5347'],
  fish_goldcarp: ['#e8b155', '#f9e6b4', '#cf8b38'],
};



/** Baut das komplette Bildmaterial. Wird einmal beim Start aufgerufen. */
export function initArt() {
  if (ready) return;

  /* --- Bäume und Gehölz --- */
  // Von jedem Baum drei Fassungen. Im dichten Wald fiel sonst sofort auf, dass
  // alle Kronen dieselbe Form haben – anderer Startwert, andere Ausbuchtungen,
  // dazu eine breitere und eine schlankere Silhouette.
  const treeShapes = [
    { spread: 1, lift: 1 },
    { spread: 1.16, lift: 0.94 },
    { spread: 0.88, lift: 1.12 },
  ];
  for (let v = 0; v < treeShapes.length; v++) {
    const s = treeShapes[v];
    addArt('tree_oak_' + v, paintTree({ seed: 21 + v * 17, spread: s.spread, lift: s.lift }));
    addArt('tree_birch_' + v, paintTree({
      seed: 34 + v * 17, spread: s.spread, lift: s.lift,
      leaf: INK.birchLeaf, leafLight: INK.birchLight, leafDark: INK.birchDark,
      leafDeep: INK.birchDeep,
      trunk: INK.birchBark, trunkShade: INK.birchShade, birchMarks: true,
    }));
    addArt('tree_maple_' + v, paintTree({
      seed: 47 + v * 17, spread: s.spread, lift: s.lift,
      leaf: INK.autumn, leafLight: INK.autumnLight, leafDark: INK.autumnDark,
      leafDeep: INK.autumnDeep, fruit: INK.berry,
    }));
    addArt('tree_pine_' + v, paintPine({ seed: 55 + v * 17 }));
  }
  addArt('tree_stump', paintStump({ seed: 137 }));
  addArt('log_barrier', paintLogBarrier({ seed: 151 }));

  /* --- Steine --- */
  addArt('rock_big', paintRock({ seed: 77 }));
  addArt('rock_small', paintRock({ seed: 83, scale: 0.66, moss: false }));
  addArt('rock_ore', paintRock({ seed: 88, ore: true }));
  addArt('rockslide', paintRockslide({ seed: 181 }));

  /* --- Kleinpflanzen --- */
  addArt('bush_berry', paintBush({ seed: 91, berries: true }));
  addArt('bush_plain', paintBush({ seed: 96 }));
  addArt('grass_tuft', paintGrassTuft({ seed: 171 }));
  addArt('reeds', paintReeds({ seed: 191 }));
  addArt('mushroom', paintMushroom({ seed: 221 }));
  addArt('herb', paintHerb({ seed: 241 }));
  addArt('shell', paintShell({ seed: 261 }));
  addArt('driftwood', paintDriftwood({ seed: 281 }));
  addArt('digspot', paintDigspot({ seed: 301 }));

  // Beete: je Art drei Wachstumsstufen
  for (let i = 0; i < CROP_IDS.length; i++) {
    const c = CROPS[CROP_IDS[i]];
    for (let st = 0; st < 3; st++) {
      addArt('crop_' + c.id + '_' + st, paintCrop({
        stage: st, leaf: c.leaf, fruit: c.fruit, form: c.form, seed: 401 + i * 37 + st * 5,
      }));
    }
    addArt('seed_' + c.id, paintSeedPouch({ band: c.fruit, seed: 451 + i * 13 }), 1);
  }

  /* --- Nur bei Nacht, Regen oder Nebel --- */
  addArt('moonflower', paintMoonflower({ seed: 811 }));
  addArt('rainmushroom', paintRainmushroom({ seed: 821 }));
  addArt('fogcrystal', paintFogcrystal({ seed: 831 }));
  addArt('flower_pink', paintFlower({ seed: 131, petal: INK.petalPink }));
  addArt('flower_yellow', paintFlower({ seed: 137, petal: INK.petalYellow }));
  addArt('flower_violet', paintFlower({ seed: 141, petal: INK.petalViolet }));
  addArt('flower_white', paintFlower({ seed: 147, petal: INK.petalWhite }));

  /* --- Lager --- */
  addArt('campfire', paintCampfire({ seed: 211 }));
  for (let f = 0; f < 4; f++) addArt('flame_' + f, paintFlame(f));
  addArt('tent', paintTent({ seed: 331 }));
  addArt('stall', paintStall({ seed: 351 }));
  addArt('workbench', paintWorkbench({ seed: 371 }));
  addArt('boat', paintBoat({ seed: 391 }));
  addArt('mailbox', paintMailbox({ seed: 411 }));
  // Die Ausbaustufen des Zuhauses – Stufe 1 ist das Zelt.
  for (let st = 2; st <= 4; st++) addArt('house_' + st, paintHouse(st, { seed: 600 + st * 31 }));

  /* --- Deko --- */
  addArt('lantern', paintLantern({ seed: 391 }));
  addArt('bench', paintBench({ seed: 411 }));
  addArt('fence', paintFence({ seed: 431 }));
  addArt('flowerbed', paintFlowerbed({ seed: 451 }));
  addArt('birdhouse', paintBirdhouse({ seed: 471 }));
  addArt('windchime', paintWindchime({ seed: 491 }));
  addArt('rug', paintRug({ seed: 511 }));
  addArt('signpost', paintSignpost({ seed: 531 }));
  addArt('crate', paintCrate({ seed: 551 }));
  addArt('chest', paintChest({ seed: 571 }));
  addArt('path_tile', paintGroundDecal('path', 591), 1);
  addArt('bridge', paintGroundDecal('bridge', 593), 1);

  /* --- Erinnerungsstücke --- */
  for (let i = 0; i < MEMORY_KINDS.length; i++) {
    addArt('memory_' + MEMORY_KINDS[i], paintMemory(MEMORY_KINDS[i], { seed: 601 + i * 17 }));
  }

  /* --- Werkzeuge --- */
  const tools = TOOL_ART;
  for (let i = 0; i < tools.length; i++) {
    addArt('tool_' + tools[i], paintTool(tools[i], { seed: 651 + i * 13 }));
  }

  /* --- Kleintiere --- */
  for (let f = 0; f < 2; f++) {
    addArt('butterfly_' + f, paintButterfly(f, { color: INK.warm }));
    addArt('bird_' + f, paintBird(f));
  }
  // Jede Falterart in ihrer eigenen Farbe. Derselbe Maler, ein Wert anders –
  // fünf unterscheidbare Tiere am Himmel für ein paar Zeilen.
  for (let i = 0; i < BUGS.length; i++) {
    const bug = BUGS[i];
    for (let f = 0; f < 2; f++) {
      addArt(bug.id + '_' + f, paintButterfly(f, { color: bug.wing, seed: 701 + i * 23 }));
    }
  }

  /* --- Figuren --- */
  const dirs = ['down', 'up', 'side'];
  for (let d = 0; d < dirs.length; d++) {
    for (let f = 0; f < 3; f++) addArt('player_' + dirs[d] + '_' + f, paintSeli(dirs[d], f));
  }
  for (const id in SPIRIT_LOOKS) {
    for (let f = 0; f < 2; f++) {
      addArt('spirit_' + id + '_' + f, paintSpirit(SPIRIT_LOOKS[id], f, { seed: 401 + id.charCodeAt(0) }));
    }
  }
  addArt('spirit_flamey_0', paintFlameSpirit(0));
  addArt('spirit_flamey_1', paintFlameSpirit(1));
  addArt('fox_0', paintFox(0));
  addArt('fox_1', paintFox(1));

  buildIcons();
  ready = true;
}

function buildIcons() {
  for (const key in ICON_PAINTERS) {
    addArt('icon_' + key, ICON_PAINTERS[key](), 1);
  }
  for (const id in FISH_COLORS) {
    const c = FISH_COLORS[id];
    addArt('icon_' + id, paintFishIcon(c[0], c[1], c[2], 900 + id.length * 7), 1);
  }
  // Symbole, die sich ihre Weltgrafik ausborgen
  const reuse = [
    ['flower_pink', 'flower_pink'], ['flower_yellow', 'flower_yellow'],
    ['flower_violet', 'flower_violet'], ['flower_white', 'flower_white'],
    ['lantern', 'lantern'], ['bench', 'bench'], ['fence', 'fence'],
    ['flowerbed', 'flowerbed'], ['birdhouse', 'birdhouse'], ['windchime', 'windchime'],
    ['rug', 'rug'], ['signpost', 'signpost'], ['path_tile', 'path_tile'],
    ['bridge_kit', 'bridge'],
    ['moonflower', 'moonflower'], ['rainmushroom', 'rainmushroom'],
    ['fogcrystal', 'fogcrystal'], ['moonlamp', 'lantern'],
    ['boat', 'boat'], ['mailbox', 'mailbox'],
  ];
  for (let i = 0; i < reuse.length; i++) {
    const target = registry[reuse[i][1]];
    if (target) {
      addArt('icon_' + reuse[i][0], iconFromArt({
        color: target.c, line: target.g, w: target.w, h: target.h, ax: target.ax, ay: target.ay,
      }), 1);
    }
  }
  for (let i = 0; i < MEMORY_KINDS.length; i++) {
    const target = registry['memory_' + MEMORY_KINDS[i]];
    const art = iconFromArt({
      color: target.c, line: target.g, w: target.w, h: target.h, ax: target.ax, ay: target.ay,
    });
    addArt('icon_memory_' + MEMORY_KINDS[i], art, 1);
    // Das Andenken am Ende einer Erinnerungskette trägt dasselbe Bild
    addArt('icon_keepsake_' + MEMORY_KINDS[i], art, 1);
  }
  // Saatbeutel: die Schnur trägt die Farbe der Pflanze
  for (let i = 0; i < CROP_IDS.length; i++) {
    const c = CROPS[CROP_IDS[i]];
    const target = registry['seed_' + c.id];
    if (target) {
      addArt('icon_' + c.seed, iconFromArt({
        color: target.c, line: target.g, w: target.w, h: target.h, ax: target.ax, ay: target.ay,
      }), 1);
    }
  }
  const tools = TOOL_ART;
  for (let i = 0; i < tools.length; i++) {
    const target = registry['tool_' + tools[i]];
    addArt('icon_' + tools[i], iconFromArt({
      color: target.c, line: target.g, w: target.w, h: target.h, ax: target.ax, ay: target.ay,
    }, { pad: 2 }), 1);
  }
  // Faltersymbole: die ausgebreitete Fassung, die liest sich klein am besten
  for (let i = 0; i < BUGS.length; i++) {
    const target = registry[BUGS[i].id + '_0'];
    if (!target) continue;
    addArt('icon_' + BUGS[i].id, iconFromArt({
      color: target.c, line: target.g, w: target.w, h: target.h, ax: target.ax, ay: target.ay,
    }), 1);
  }
}
