/** Bauplaene der Werkbank, Werkzeugstufen und Lagerfeuer-Ausbau. */

/** Lagerfeuer: Brennstoff (Holz o. Ae.) hebt die Stufe. */
export const CAMPFIRE_LEVELS = [
  { level: 1, fuel: 0, radius: 82, light: 74 },
  { level: 2, fuel: 14, radius: 108, light: 92 },
  { level: 3, fuel: 40, radius: 136, light: 110 },
  { level: 4, fuel: 84, radius: 168, light: 128 },
  { level: 5, fuel: 150, radius: 205, light: 150 },
];

export function campfireLevelFor(fuel) {
  let lvl = CAMPFIRE_LEVELS[0];
  for (let i = 0; i < CAMPFIRE_LEVELS.length; i++) {
    if (fuel >= CAMPFIRE_LEVELS[i].fuel) lvl = CAMPFIRE_LEVELS[i];
  }
  return lvl;
}

export function nextCampfireLevel(fuel) {
  for (let i = 0; i < CAMPFIRE_LEVELS.length; i++) {
    if (fuel < CAMPFIRE_LEVELS[i].fuel) return CAMPFIRE_LEVELS[i];
  }
  return null;
}

function r(id, name, out, cost, opts) {
  const o = {
    id: id,
    name: name,
    out: out,
    cost: cost,
    ember: 0,
    fire: 1,
    kind: 'item',
  };
  if (opts) for (const k in opts) o[k] = opts[k];
  return o;
}

export const RECIPES = [
  // Wege & Zaun – guenstig, viel Wirkung
  r('path_tile', 'Steinweg (4x)', { id: 'path_tile', n: 4 }, [{ id: 'stone', n: 2 }]),
  r('fence', 'Zaunstück', { id: 'fence', n: 1 }, [{ id: 'wood', n: 3 }, { id: 'fiber', n: 1 }]),
  r('signpost', 'Wegweiser', { id: 'signpost', n: 1 }, [{ id: 'wood', n: 4 }, { id: 'stone', n: 1 }]),
  r('bench', 'Holzbank', { id: 'bench', n: 1 }, [{ id: 'wood', n: 6 }, { id: 'fiber', n: 2 }]),
  r('flowerbed', 'Blumenbeet', { id: 'flowerbed', n: 1 },
    [{ id: 'wood', n: 3 }, { id: 'clay', n: 2 }, { id: 'fiber', n: 2 }]),

  // Ab Feuerstufe 2
  r('lantern', 'Laterne', { id: 'lantern', n: 1 },
    [{ id: 'wood', n: 4 }, { id: 'stone', n: 2 }, { id: 'copper_ore', n: 1 }], { ember: 4, fire: 2 }),
  r('birdhouse', 'Vogelhaus', { id: 'birdhouse', n: 1 },
    [{ id: 'wood', n: 5 }, { id: 'fiber', n: 2 }, { id: 'resin', n: 1 }], { ember: 3, fire: 2 }),
  r('rug', 'Flickenteppich', { id: 'rug', n: 1 },
    [{ id: 'fiber', n: 8 }, { id: 'flower_pink', n: 2 }], { ember: 3, fire: 2 }),

  // Ab Feuerstufe 3
  r('windchime', 'Windspiel', { id: 'windchime', n: 1 },
    [{ id: 'driftwood', n: 3 }, { id: 'shell', n: 3 }, { id: 'copper_ore', n: 1 }], { ember: 6, fire: 3 }),
  r('bridge_kit', 'Brückenbausatz', { id: 'bridge_kit', n: 1 },
    [{ id: 'hardwood', n: 10 }, { id: 'stone', n: 8 }, { id: 'copper_ore', n: 4 }],
    { ember: 18, fire: 3, once: true, note: 'Öffnet den Weg zu den Klippen.' }),

  // Werkzeuge
  r('axe2', 'Axt · Stufe 2', null, [{ id: 'wood', n: 6 }, { id: 'stone', n: 6 }, { id: 'copper_ore', n: 2 }],
    { ember: 6, kind: 'tool', tool: 'axe', level: 2, fire: 2 }),
  r('axe3', 'Axt · Stufe 3', null, [{ id: 'hardwood', n: 6 }, { id: 'copper_ore', n: 6 }, { id: 'gem', n: 1 }],
    { ember: 14, kind: 'tool', tool: 'axe', level: 3, fire: 3 }),
  r('pickaxe2', 'Spitzhacke · Stufe 2', null, [{ id: 'wood', n: 6 }, { id: 'stone', n: 8 }],
    { ember: 6, kind: 'tool', tool: 'pickaxe', level: 2, fire: 2 }),
  r('pickaxe3', 'Spitzhacke · Stufe 3', null, [{ id: 'hardwood', n: 6 }, { id: 'copper_ore', n: 8 }, { id: 'gem', n: 1 }],
    { ember: 14, kind: 'tool', tool: 'pickaxe', level: 3, fire: 3 }),
  r('shovel2', 'Schaufel · Stufe 2', null, [{ id: 'wood', n: 5 }, { id: 'copper_ore', n: 3 }],
    { ember: 5, kind: 'tool', tool: 'shovel', level: 2, fire: 2 }),
  r('rod2', 'Angel · Stufe 2', null, [{ id: 'wood', n: 5 }, { id: 'fiber', n: 6 }, { id: 'copper_ore', n: 2 }],
    { ember: 5, kind: 'tool', tool: 'rod', level: 2, fire: 2 }),

  // Tasche
  r('bag2', 'Größere Tasche (+10)', null, [{ id: 'fiber', n: 10 }, { id: 'resin', n: 3 }],
    { ember: 8, kind: 'bag', slots: 10, fire: 2, max: 2 }),
];

export function recipeById(id) {
  for (let i = 0; i < RECIPES.length; i++) if (RECIPES[i].id === id) return RECIPES[i];
  return null;
}

/** Fehlende Zutaten eines Bauplans. */
export function missingFor(recipe, inventory, ember) {
  const miss = [];
  for (let i = 0; i < recipe.cost.length; i++) {
    const c = recipe.cost[i];
    const have = inventory.count(c.id);
    if (have < c.n) miss.push({ id: c.id, need: c.n, have: have });
  }
  if (recipe.ember && ember < recipe.ember) {
    miss.push({ id: 'ember', need: recipe.ember, have: ember });
  }
  return miss;
}
