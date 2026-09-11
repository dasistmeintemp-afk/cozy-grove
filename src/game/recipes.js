/** Baupläne der Werkbank, Werkzeugstufen und Lagerfeuer-Ausbau. */

/** Lagerfeuer: Brennstoff (Holz o. Ae.) hebt die Stufe. */
export const CAMPFIRE_LEVELS = [
  { level: 1, fuel: 0, radius: 328, light: 296 },
  { level: 2, fuel: 14, radius: 432, light: 368 },
  { level: 3, fuel: 40, radius: 544, light: 440 },
  { level: 4, fuel: 84, radius: 672, light: 512 },
  { level: 5, fuel: 150, radius: 820, light: 600 },
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
  // Wege & Zaun – günstig, viel Wirkung
  r('path_tile', 'Steinweg (4x)', { id: 'path_tile', n: 4 }, [{ id: 'stone', n: 2 }]),
  r('fence', 'Zaunstück', { id: 'fence', n: 1 }, [{ id: 'wood', n: 3 }, { id: 'fiber', n: 1 }]),
  r('signpost', 'Wegweiser', { id: 'signpost', n: 1 }, [{ id: 'wood', n: 4 }, { id: 'stone', n: 1 }]),
  r('bench', 'Holzbank', { id: 'bench', n: 1 }, [{ id: 'wood', n: 6 }, { id: 'fiber', n: 2 }]),
  r('flowerbed', 'Blumenbeet', { id: 'flowerbed', n: 1 },
    [{ id: 'wood', n: 3 }, { id: 'clay', n: 2 }, { id: 'fiber', n: 2 }]),
  // Was man aus dem baut, was ohnehin herumliegt. Billig mit Absicht: Der
  // Katalog kostet Münzen, die Werkbank kostet einen Spaziergang.
  r('stump', 'Baumstumpfhocker', { id: 'stump', n: 1 },
    [{ id: 'hardwood', n: 3 }, { id: 'fiber', n: 1 }]),
  r('steppingstones', 'Trittsteine (3x)', { id: 'steppingstones', n: 3 },
    [{ id: 'stone', n: 4 }]),
  r('torch', 'Fackel', { id: 'torch', n: 1 },
    [{ id: 'wood', n: 3 }, { id: 'resin', n: 2 }, { id: 'fiber', n: 1 }]),

  // Ab Feuerstufe 2
  r('lantern', 'Laterne', { id: 'lantern', n: 1 },
    [{ id: 'wood', n: 4 }, { id: 'stone', n: 2 }, { id: 'copper_ore', n: 1 }], { ember: 4, fire: 2 }),
  r('birdhouse', 'Vogelhaus', { id: 'birdhouse', n: 1 },
    [{ id: 'wood', n: 5 }, { id: 'fiber', n: 2 }, { id: 'resin', n: 1 }], { ember: 3, fire: 2 }),
  r('rug', 'Flickenteppich', { id: 'rug', n: 1 },
    [{ id: 'fiber', n: 8 }, { id: 'flower_pink', n: 2 }], { ember: 3, fire: 2 }),
  r('flowerbox', 'Blumenkasten', { id: 'flowerbox', n: 1 },
    [{ id: 'wood', n: 4 }, { id: 'clay', n: 1 }, { id: 'flower_yellow', n: 2 }],
    { ember: 3, fire: 2 }),
  r('clothesline', 'Wäscheleine', { id: 'clothesline', n: 1 },
    [{ id: 'wood', n: 3 }, { id: 'fiber', n: 6 }], { ember: 3, fire: 2 }),
  r('hedgehogbox', 'Igelhaus', { id: 'hedgehogbox', n: 1 },
    [{ id: 'wood', n: 3 }, { id: 'fiber', n: 5 }, { id: 'mushroom', n: 1 }],
    { ember: 4, fire: 2 }),

  // Ab Feuerstufe 3
  r('windchime', 'Windspiel', { id: 'windchime', n: 1 },
    [{ id: 'driftwood', n: 3 }, { id: 'shell', n: 3 }, { id: 'copper_ore', n: 1 }], { ember: 6, fire: 3 }),
  r('stonebench', 'Steinbank', { id: 'stonebench', n: 1 },
    [{ id: 'stone', n: 10 }, { id: 'clay', n: 3 }], { ember: 6, fire: 3 }),
  r('arch', 'Torbogen', { id: 'arch', n: 1 },
    [{ id: 'hardwood', n: 6 }, { id: 'fiber', n: 4 }, { id: 'flower_white', n: 3 }],
    { ember: 8, fire: 3 }),
  // Aus dem, was nur Nacht, Regen und Nebel hergeben. Sie sind der Grund,
  // an einem anderen Tag oder zu anderer Stunde wiederzukommen.
  r('moonlamp', 'Mondlaterne', { id: 'moonlamp', n: 1 },
    [{ id: 'moonflower', n: 3 }, { id: 'fogcrystal', n: 2 }, { id: 'copper_ore', n: 3 }],
    { ember: 14, fire: 3, note: 'Leuchtet doppelt so weit wie eine Laterne.' }),

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
  r('net2', 'Kescher · Stufe 2', null, [{ id: 'wood', n: 4 }, { id: 'fiber', n: 8 }],
    { ember: 4, kind: 'tool', tool: 'net', level: 2, fire: 1 }),
  r('net3', 'Kescher · Stufe 3', null, [{ id: 'hardwood', n: 4 }, { id: 'fiber', n: 12 }, { id: 'resin', n: 3 }],
    { ember: 10, kind: 'tool', tool: 'net', level: 3, fire: 2 }),

  // Tasche
  r('bag2', 'Größere Tasche (+10)', null, [{ id: 'fiber', n: 10 }, { id: 'resin', n: 3 }],
    { ember: 8, kind: 'bag', slots: 10, fire: 2, max: 2 }),

  /* ----------------------------------------------------------------------
   * Was erst die Farbe der Insel hergibt.
   *
   * `needs` nennt den Meilenstein (siehe milestones.js). Das ist die zweite
   * Hälfte des langen Bogens: Die Anzeige oben steigt jetzt über Wochen statt
   * über Tage, und unterwegs kommt regelmäßig etwas Neues an die Werkbank.
   * Preise absichtlich hoch – das sind die Stücke, auf die man hinarbeitet.
   * -------------------------------------------------------------------- */

  // Die Gießkanne: das erste Werkzeug, das man nicht von Anfang an hat.
  r('can1', 'Gießkanne', null,
    [{ id: 'copper_ore', n: 6 }, { id: 'wood', n: 4 }, { id: 'clay', n: 3 }],
    {
      ember: 10, kind: 'tool', tool: 'can', level: 1, fire: 2, needs: 'fleck',
      note: 'Ein gegossenes Beet wächst einen Tag schneller.',
    }),

  r('bag3', 'Noch größere Tasche (+12)', null,
    [{ id: 'fiber', n: 16 }, { id: 'resin', n: 6 }, { id: 'hardwood', n: 4 }],
    { ember: 20, kind: 'bag', slots: 12, fire: 3, min: 2, max: 3, needs: 'tasche' }),

  r('shovel3', 'Schaufel · Stufe 3', null,
    [{ id: 'hardwood', n: 5 }, { id: 'copper_ore', n: 6 }, { id: 'shard', n: 2 }],
    { ember: 14, kind: 'tool', tool: 'shovel', level: 3, fire: 3, needs: 'werkzeugtag' }),
  r('rod3', 'Angel · Stufe 3', null,
    [{ id: 'hardwood', n: 5 }, { id: 'fiber', n: 12 }, { id: 'shell', n: 6 }],
    { ember: 14, kind: 'tool', tool: 'rod', level: 3, fire: 3, needs: 'werkzeugtag' }),

  r('axe4', 'Axt · Stufe 4', null,
    [{ id: 'hardwood', n: 12 }, { id: 'copper_ore', n: 10 }, { id: 'gem', n: 2 }],
    { ember: 30, kind: 'tool', tool: 'axe', level: 4, fire: 4, needs: 'wald' }),
  r('pickaxe4', 'Spitzhacke · Stufe 4', null,
    [{ id: 'hardwood', n: 10 }, { id: 'copper_ore', n: 12 }, { id: 'gem', n: 2 }],
    { ember: 30, kind: 'tool', tool: 'pickaxe', level: 4, fire: 4, needs: 'wald' }),

  r('net4', 'Kescher · Stufe 4', null,
    [{ id: 'hardwood', n: 8 }, { id: 'fiber', n: 20 }, { id: 'fogcrystal', n: 2 }],
    { ember: 26, kind: 'tool', tool: 'net', level: 4, fire: 4, needs: 'daumen' }),

  r('rod4', 'Angel · Stufe 4', null,
    [{ id: 'hardwood', n: 8 }, { id: 'moonflower', n: 3 }, { id: 'gem', n: 2 }],
    { ember: 34, kind: 'tool', tool: 'rod', level: 4, fire: 4, needs: 'see' }),

  /* --------------------------------------------------------------------
   * Aus dem Hochland.
   *
   * Granit und Bernstein gibt es nur dort, und dort kommt man nur mit der
   * dritten und vierten Spitzhackenstufe hin. Damit hat der neue Bereich
   * etwas, das man mitbringt, und die letzten Werkzeugstufen haben einen
   * Grund über sich hinaus.
   * -------------------------------------------------------------------- */

  r('stonelamp', 'Steinlaterne', { id: 'moonlamp', n: 1 },
    [{ id: 'granite', n: 8 }, { id: 'copper_ore', n: 4 }, { id: 'gem', n: 1 }],
    { ember: 18, fire: 3, needs: 'insel', note: 'Leuchtet so weit wie die Mondlaterne.' }),
  r('gravel', 'Steinweg aus Granit', { id: 'path_tile', n: 12 },
    [{ id: 'granite', n: 3 }, { id: 'stone', n: 4 }],
    { ember: 6, fire: 2, needs: 'insel', note: 'Zwölf Wegstücke auf einmal.' }),
  r('amberlamp', 'Bernsteinlicht', { id: 'paperlamp', n: 1 },
    [{ id: 'amber', n: 1 }, { id: 'granite', n: 6 }, { id: 'hardwood', n: 4 }],
    { ember: 22, fire: 3, needs: 'insel', note: 'Warmes Licht, das nie ausgeht.' }),
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
