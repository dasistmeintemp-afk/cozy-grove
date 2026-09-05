/** Alles, was auf der Insel steht: Baeume, Steine, Sammelgut, Bauten, Geister. */
import { randInt } from '../core/rng.js';
import { nextId } from '../core/util.js';

export const TOOL = { HAND: 'hand', AXE: 'axe', PICK: 'pickaxe', SHOVEL: 'shovel', ROD: 'rod' };

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
 *  reachR      Reichweite fuer Interaktion (Pixel)
 *  tool        benoetigtes Werkzeug
 *  minLevel    benoetigte Werkzeugstufe
 *  hits        Schlaege bis erschoepft
 *  yield       (level, rng) => [{id, n}]
 *  becomes     Folgezustand nach Abbau (kind) – sonst verschwindet das Objekt
 *  respawn     Tage bis zur Rueckkehr
 *  sway        wackelt im Wind
 */
export const ENTITY_DEFS = {
  tree_oak: {
    sprite: 'tree_oak', solid: true, blockR: 24, reachR: 88, tool: TOOL.AXE, hits: 3,
    yield: function (level, rng) {
      const out = [{ id: 'wood', n: randInt(rng, 2, 3) + level }];
      if (level >= 2 && rng() < 0.35) out.push({ id: 'hardwood', n: 1 });
      if (rng() < 0.28) out.push({ id: 'resin', n: 1 });
      return out;
    },
    becomes: 'tree_stump', respawn: 3, sway: true, category: 'tree',
  },
  tree_birch: {
    sprite: 'tree_birch', solid: true, blockR: 20, reachR: 88, tool: TOOL.AXE, hits: 3,
    yield: function (level, rng) {
      const out = [{ id: 'wood', n: randInt(rng, 2, 3) + level }];
      if (rng() < 0.3) out.push({ id: 'fiber', n: randInt(rng, 1, 2) });
      return out;
    },
    becomes: 'tree_stump', respawn: 3, sway: true, category: 'tree',
  },
  tree_maple: {
    sprite: 'tree_maple', solid: true, blockR: 24, reachR: 88, tool: TOOL.AXE, hits: 3,
    yield: function (level, rng) {
      const out = [{ id: 'wood', n: randInt(rng, 2, 3) + level }];
      if (rng() < 0.45) out.push({ id: 'resin', n: 1 });
      return out;
    },
    becomes: 'tree_stump', respawn: 3, sway: true, category: 'tree',
  },
  tree_pine: {
    sprite: 'tree_pine', solid: true, blockR: 24, reachR: 88, tool: TOOL.AXE, hits: 4,
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
  driftwood: {
    sprite: 'driftwood', solid: false, reachR: 64, tool: TOOL.HAND, hits: 1,
    yield: drop('driftwood', 1, 1), respawn: 1, category: 'forage',
  },
  flower_pink: { sprite: 'flower_pink', solid: false, reachR: 56, tool: TOOL.HAND, hits: 1, yield: drop('flower_pink', 1, 1), respawn: 1, sway: true, category: 'forage' },
  flower_yellow: { sprite: 'flower_yellow', solid: false, reachR: 56, tool: TOOL.HAND, hits: 1, yield: drop('flower_yellow', 1, 1), respawn: 1, sway: true, category: 'forage' },
  flower_violet: { sprite: 'flower_violet', solid: false, reachR: 56, tool: TOOL.HAND, hits: 1, yield: drop('flower_violet', 1, 1), respawn: 1, sway: true, category: 'forage' },
  flower_white: { sprite: 'flower_white', solid: false, reachR: 56, tool: TOOL.HAND, hits: 1, yield: drop('flower_white', 1, 1), respawn: 1, sway: true, category: 'forage' },

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
  bridge_spot: { sprite: 'signpost', solid: false, reachR: 120, category: 'station', station: 'bridge' },

  // Lebewesen
  spirit: { solid: false, reachR: 120, category: 'spirit' },
  fox: { sprite: 'fox_0', solid: false, reachR: 112, category: 'fox' },

  // Aufgabengegenstaende
  hidden: { solid: false, reachR: 80, tool: TOOL.HAND, hits: 1, category: 'hidden' },

  // Vom Spieler aufgestellte Deko
  decor: { solid: true, blockR: 28, reachR: 80, category: 'decor' },
};

export function defOf(kind) {
  return ENTITY_DEFS[kind] || null;
}

/** Erzeugt eine Weltinstanz. x/y sind Weltpixel (Fusspunkt). */
export function makeEntity(kind, x, y, extra) {
  const def = ENTITY_DEFS[kind];
  const e = {
    id: nextId(),
    kind: kind,
    x: x,
    y: y,
    sprite: def && def.sprite ? def.sprite : null,
    hp: def && def.hits ? def.hits : 0,
    hidden: false,
    respawnDay: 0,
    phase: (x * 0.7 + y * 1.3) % 6.28,
  };
  if (extra) for (const k in extra) e[k] = extra[k];
  return e;
}

/** Sortierschluessel fuer die Tiefenstaffelung. */
export function sortKey(e) {
  return e.y + (e.zBias || 0);
}
