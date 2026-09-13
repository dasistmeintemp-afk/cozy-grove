/** Alles, was auf der Insel steht: Bäume, Steine, Sammelgut, Bauten, Geister. */
import { randInt } from '../core/rng.js';
import { nextId } from '../core/util.js';

export const TOOL = {
  HAND: 'hand', AXE: 'axe', PICK: 'pickaxe', SHOVEL: 'shovel', ROD: 'rod', NET: 'net',
  CAN: 'can',
};

function drop(id, min, max) {
  return function (level, rng) {
    const n = randInt(rng, min, max) + Math.max(0, level - 1);
    return [{ id: id, n: n }];
  };
}

/**
 * kind -> Definition
 *  sprite      Grafikname
 *  solid       blockiert Bewegung
 *  blockR      Kollisionsradius (Pixel)
 *  reachR      Reichweite für Interaktion (Pixel)
 *  tool        benötigtes Werkzeug
 *  minLevel    benötigte Werkzeugstufe
 *  hits        Schläge bis erschöpft
 *  yield       (level, rng) => [{id, n}]
 *  becomes     Folgezustand nach Abbau (kind) – sonst verschwindet das Objekt
 *  respawn     Tage bis zur Rückkehr
 *  sway        wackelt im Wind
 */
export const ENTITY_DEFS = {
  tree_oak: {
    sprite: 'tree_oak', variants: 3, solid: true, blockR: 24, reachR: 88, tool: TOOL.AXE, hits: 3,
    yield: function (level, rng) {
      const out = [{ id: 'wood', n: randInt(rng, 2, 3) + level }];
      if (level >= 2 && rng() < 0.35) out.push({ id: 'hardwood', n: 1 });
      if (rng() < 0.28) out.push({ id: 'resin', n: 1 });
      return out;
    },
    becomes: 'tree_stump', respawn: 3, sway: true, category: 'tree',
  },
  tree_birch: {
    sprite: 'tree_birch', variants: 3, solid: true, blockR: 20, reachR: 88, tool: TOOL.AXE, hits: 3,
    yield: function (level, rng) {
      const out = [{ id: 'wood', n: randInt(rng, 2, 3) + level }];
      if (rng() < 0.3) out.push({ id: 'fiber', n: randInt(rng, 1, 2) });
      return out;
    },
    becomes: 'tree_stump', respawn: 3, sway: true, category: 'tree',
  },
  tree_maple: {
    sprite: 'tree_maple', variants: 3, solid: true, blockR: 24, reachR: 88, tool: TOOL.AXE, hits: 3,
    yield: function (level, rng) {
      const out = [{ id: 'wood', n: randInt(rng, 2, 3) + level }];
      if (rng() < 0.45) out.push({ id: 'resin', n: 1 });
      return out;
    },
    becomes: 'tree_stump', respawn: 3, sway: true, category: 'tree',
  },
  tree_pine: {
    sprite: 'tree_pine', variants: 3, solid: true, blockR: 24, reachR: 88, tool: TOOL.AXE, hits: 4,
    yield: function (level, rng) {
      const out = [{ id: 'wood', n: randInt(rng, 3, 4) + level }];
      if (level >= 2 && rng() < 0.5) out.push({ id: 'hardwood', n: randInt(rng, 1, 2) });
      return out;
    },
    becomes: 'tree_stump', respawn: 4, sway: true, category: 'tree',
  },
  tree_stump: {
    sprite: 'tree_stump', solid: true, blockR: 20, reachR: 72, tool: null, category: 'stump',
  },

  rock_big: {
    sprite: 'rock_big', solid: true, blockR: 28, reachR: 80, tool: TOOL.PICK, hits: 3,
    yield: function (level, rng) {
      const out = [{ id: 'stone', n: randInt(rng, 2, 3) + level }];
      if (rng() < 0.3) out.push({ id: 'clay', n: 1 });
      return out;
    },
    respawn: 2, category: 'rock',
  },
  rock_small: {
    sprite: 'rock_small', solid: true, blockR: 20, reachR: 72, tool: TOOL.PICK, hits: 1,
    yield: drop('stone', 1, 2), respawn: 1, category: 'rock',
  },
  rock_ore: {
    sprite: 'rock_ore', solid: true, blockR: 28, reachR: 80, tool: TOOL.PICK, minLevel: 2, hits: 4,
    yield: function (level, rng) {
      const out = [{ id: 'copper_ore', n: randInt(rng, 1, 2) + (level >= 3 ? 1 : 0) }, { id: 'stone', n: randInt(rng, 1, 2) }];
      if (rng() < 0.12) out.push({ id: 'gem', n: 1 });
      return out;
    },
    respawn: 3, category: 'rock',
  },

  // Nur im Hochland der Stillen Insel. Die dritte Spitzhackenstufe ist die
  // Eintrittskarte: Ein neuer Bereich, den man mit dem Werkzeug vom ersten
  // Tag leerräumt, gibt dem Aufsteigen keinen Sinn.
  rock_granite: {
    sprite: 'rock_granite', solid: true, blockR: 30, reachR: 84, tool: TOOL.PICK, minLevel: 3, hits: 5,
    yield: function (level, rng) {
      const out = [
        { id: 'granite', n: randInt(rng, 1, 2) + (level >= 4 ? 1 : 0) },
        { id: 'stone', n: randInt(rng, 1, 3) },
      ];
      if (rng() < 0.18) out.push({ id: 'copper_ore', n: 1 });
      return out;
    },
    respawn: 3, category: 'rock',
  },
  rock_geode: {
    sprite: 'rock_geode', solid: true, blockR: 28, reachR: 84, tool: TOOL.PICK, minLevel: 4, hits: 6,
    yield: function (level, rng) {
      const out = [{ id: 'amber', n: 1 }, { id: 'granite', n: randInt(rng, 1, 2) }];
      if (rng() < 0.4) out.push({ id: 'gem', n: 1 });
      return out;
    },
    respawn: 5, category: 'rock',
  },

  /**
   * Das Haustier. Kein `solid`: Man soll nicht an der eigenen Katze
   * hängenbleiben. Der Napf dagegen ist gewöhnliche Deko – gefüttert wird
   * das Tier, nicht die Schüssel.
   */
  pet: {
    sprite: 'pet_cat_0', solid: false, reachR: 96, category: 'pet', priority: 30,
  },
  bush_berry: {
    sprite: 'bush_berry', solid: true, blockR: 24, reachR: 72, tool: TOOL.HAND, hits: 1,
    yield: drop('berry', 1, 2), becomes: 'bush_plain', respawn: 1, sway: true, category: 'forage',
  },
  bush_plain: { sprite: 'bush_plain', solid: true, blockR: 24, reachR: 64, tool: null, sway: true, category: 'bush' },

  reeds: {
    sprite: 'reeds', solid: false, reachR: 64, tool: TOOL.HAND, hits: 1,
    yield: drop('fiber', 1, 2), respawn: 1, sway: true, category: 'forage',
  },
  grass_tuft: {
    sprite: 'grass_tuft', solid: false, reachR: 56, tool: TOOL.HAND, hits: 1,
    yield: drop('fiber', 1, 1), respawn: 1, sway: true, category: 'forage',
  },
  mushroom: {
    sprite: 'mushroom', solid: false, reachR: 56, tool: TOOL.HAND, hits: 1,
    yield: drop('mushroom', 1, 1), respawn: 1, category: 'forage',
  },
  herb: {
    sprite: 'herb', solid: false, reachR: 56, tool: TOOL.HAND, hits: 1,
    yield: drop('herb', 1, 1), respawn: 1, sway: true, category: 'forage',
  },
  shell: {
    sprite: 'shell', solid: false, reachR: 56, tool: TOOL.HAND, hits: 1,
    yield: drop('shell', 1, 1), respawn: 1, category: 'forage',
  },
  /**
   * Federn lagen bisher in keiner Welt, obwohl ein Geist darum bitten
   * konnte und das Fundbuch sie verlangte. Sie liegen dort, wo Vögel sind:
   * unter Bäumen und am Strand.
   */
  feather: {
    sprite: 'feather', solid: false, reachR: 56, tool: TOOL.HAND, hits: 1,
    yield: drop('feather', 1, 1), respawn: 1, sway: true, category: 'forage',
  },
  stardust: {
    sprite: 'stardust', solid: false, reachR: 60, tool: TOOL.HAND, hits: 1,
    yield: drop('stardust', 1, 1), category: 'forage',
  },
  driftwood: {
    sprite: 'driftwood', solid: false, reachR: 64, tool: TOOL.HAND, hits: 1,
    yield: drop('driftwood', 1, 1), respawn: 1, category: 'forage',
  },
  flower_pink: { sprite: 'flower_pink', solid: false, reachR: 56, tool: TOOL.HAND, hits: 1, yield: drop('flower_pink', 1, 1), respawn: 1, sway: true, category: 'forage' },
  flower_yellow: { sprite: 'flower_yellow', solid: false, reachR: 56, tool: TOOL.HAND, hits: 1, yield: drop('flower_yellow', 1, 1), respawn: 1, sway: true, category: 'forage' },
  flower_violet: { sprite: 'flower_violet', solid: false, reachR: 56, tool: TOOL.HAND, hits: 1, yield: drop('flower_violet', 1, 1), respawn: 1, sway: true, category: 'forage' },
  flower_white: { sprite: 'flower_white', solid: false, reachR: 56, tool: TOOL.HAND, hits: 1, yield: drop('flower_white', 1, 1), respawn: 1, sway: true, category: 'forage' },

  // Wetter- und Nachtvorkommen. Sie werden jeden Tag neu gesetzt und
  // verschwinden wieder, sobald die Bedingung nicht mehr gilt.
  moonflower: {
    sprite: 'moonflower', solid: false, reachR: 60, tool: TOOL.HAND, hits: 1,
    yield: drop('moonflower', 1, 1), sway: true, category: 'forage',
  },
  rainmushroom: {
    sprite: 'rainmushroom', solid: false, reachR: 60, tool: TOOL.HAND, hits: 1,
    yield: drop('rainmushroom', 1, 1), category: 'forage',
  },
  fogcrystal: {
    sprite: 'fogcrystal', solid: false, reachR: 60, tool: TOOL.PICK, hits: 1,
    yield: drop('fogcrystal', 1, 1), category: 'forage',
  },

  digspot: {
    sprite: 'digspot', solid: false, reachR: 64, tool: TOOL.SHOVEL, hits: 1,
    yield: function (level, rng) {
      const roll = rng();
      if (roll < 0.3) return [{ id: 'clay', n: randInt(rng, 1, 2) }];
      if (roll < 0.5) return [{ id: 'shard', n: 1 }];
      if (roll < 0.66) return [{ id: 'bone', n: 1 }];
      if (roll < 0.78) return [{ id: 'bottle', n: 1 }];
      if (roll < 0.9) return [{ id: 'coin_pouch', n: 1 }];
      if (roll < 0.97) return [{ id: 'stone', n: randInt(rng, 1, 3) }];
      return [{ id: 'gem', n: 1 }];
    },
    category: 'dig',
  },

  // Hindernisse
  log_barrier: {
    sprite: 'log_barrier', solid: true, blockR: 68, blockH: 32, reachR: 104,
    tool: TOOL.AXE, minLevel: 2, hits: 6,
    yield: function (level, rng) { return [{ id: 'wood', n: randInt(rng, 4, 6) }, { id: 'hardwood', n: 2 }]; },
    unlocks: 1, category: 'barrier',
  },
  rockslide: {
    sprite: 'rockslide', solid: true, blockR: 72, blockH: 36, reachR: 104,
    tool: TOOL.PICK, minLevel: 3, hits: 6,
    yield: function (level, rng) { return [{ id: 'stone', n: randInt(rng, 5, 8) }, { id: 'copper_ore', n: 2 }, { id: 'gem', n: 1 }]; },
    category: 'barrier',
  },

  // Bauten
  campfire: { sprite: 'campfire', solid: true, blockR: 40, reachR: 120, category: 'station', station: 'campfire' },
  tent: { sprite: 'tent', solid: true, blockR: 72, blockH: 40, reachR: 112, category: 'station', station: 'tent' },
  workbench: { sprite: 'workbench', solid: true, blockR: 56, blockH: 28, reachR: 104, category: 'station', station: 'craft' },
  stall: { sprite: 'stall', solid: true, blockR: 80, blockH: 40, reachR: 120, category: 'station', station: 'shop' },
  // Die Kochstelle steht im Lager, gleich neben dem Feuer. Kein Meilenstein
  // davor: Sie nimmt, was ohnehin herumliegt, und wer am ersten Tag drei
  // Beeren findet, soll damit etwas anfangen können.
  kitchen: { sprite: 'kitchen', solid: true, blockR: 54, blockH: 26, reachR: 104, category: 'station', station: 'kitchen' },
  bridge_spot: { sprite: 'signpost', solid: false, reachR: 120, category: 'station', station: 'bridge' },
  /**
   * Das Ruderboot: an beiden Ufern eines. Nicht fest, damit man am schmalen
   * Anleger nicht daran hängen bleibt.
   *
   * `priority` weil man IM Boot steht: Ohne den Zuschlag gewann jedes
   * Grasbüschel unter den Füßen gegen das Boot – man stand am Anleger und
   * las „Sammeln" statt „Übersetzen". Alle anderen Stationen sind fest, da
   * kann nichts unter einem liegen.
   */
  boat: {
    sprite: 'boat', solid: false, reachR: 132,
    category: 'station', station: 'boat', priority: 40,
  },
  mailbox: {
    sprite: 'mailbox', solid: true, blockR: 18, reachR: 96,
    category: 'station', station: 'mail',
  },
  // Die Vorratstruhe. Steht erst da, wenn die erste Ausbaustufe bezahlt ist –
  // vorher wäre sie eine Kiste, die man nicht öffnen darf.
  storage: {
    sprite: 'chest', solid: true, blockR: 30, blockH: 18, reachR: 104,
    category: 'station', station: 'storage',
  },

  // Lebewesen
  spirit: { solid: false, reachR: 120, category: 'spirit' },
  fox: { sprite: 'fox_0', solid: false, reachR: 112, category: 'fox' },
  // Der Wanderer – steht einen Tag am Strand. Nicht fest: Wer ihn nicht
  // ansprechen will, soll an ihm vorbeigehen können, ohne ihn zu umrunden.
  wanderer: { sprite: 'wanderer_0', solid: false, reachR: 120, category: 'wanderer' },

  // Aufgabengegenstände
  hidden: { solid: false, reachR: 80, tool: TOOL.HAND, hits: 1, category: 'hidden' },

  // Vom Spieler aufgestellte Deko
  decor: { solid: true, blockR: 28, reachR: 80, category: 'decor' },

  // Ein Beet. Nicht fest: Man soll darüberlaufen können, sonst wäre ein
  // angelegter Garten eine Mauer aus Pflanzen. Die Grafik hängt an Art und
  // Wachstumsstufe und wird beim Setzen gesetzt, nicht hier.
  crop: { solid: false, reachR: 72, tool: TOOL.HAND, hits: 1, category: 'crop' },
};

export function defOf(kind) {
  return ENTITY_DEFS[kind] || null;
}

/** Erzeugt eine Weltinstanz. x/y sind Weltpixel (Fußpunkt). */
/**
 * Welche Fassung einer Grafik dieses Objekt bekommt.
 * Hängt nur am Ort, damit derselbe Baum nach dem Laden wieder gleich aussieht.
 */
function variantAt(x, y, count) {
  const h = (Math.round(x) * 73856093) ^ (Math.round(y) * 19349663);
  return ((h >>> 3) % count + count) % count;
}

/**
 * Der Grafikname für eine Art an einem Ort – inklusive Fassungsnummer.
 *
 * Wird nicht nur beim Erzeugen gebraucht, sondern auch, wenn ein Objekt seine
 * Art wechselt und wieder zurückwechselt: Ein gefällter Ahorn wird zum Stumpf
 * und drei Tage später wieder zum Ahorn. Setzte man dabei einfach `def.sprite`,
 * stünde dort `tree_maple` – eine Grafik, die es gar nicht gibt, denn gemalt
 * sind nur `tree_maple_0` bis `_2`. Der Baum wurde damit unsichtbar,
 * blockierte aber weiter den Weg.
 */
export function spriteFor(kind, x, y) {
  const def = ENTITY_DEFS[kind];
  if (!def || !def.sprite) return null;
  if (def.variants > 1) return def.sprite + '_' + variantAt(x, y, def.variants);
  return def.sprite;
}

export function makeEntity(kind, x, y, extra) {
  const def = ENTITY_DEFS[kind];
  const sprite = spriteFor(kind, x, y);
  const e = {
    id: nextId(),
    kind: kind,
    x: x,
    y: y,
    sprite: sprite,
    hp: def && def.hits ? def.hits : 0,
    hidden: false,
    respawnDay: 0,
    phase: (x * 0.7 + y * 1.3) % 6.28,
  };
  if (extra) for (const k in extra) e[k] = extra[k];
  return e;
}

/** Sortierschlüssel für die Tiefenstaffelung. */
export function sortKey(e) {
  return e.y + (e.zBias || 0);
}
