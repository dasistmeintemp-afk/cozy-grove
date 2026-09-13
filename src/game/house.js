/**
 * Vom Zelt zum Haus.
 *
 * Die dritte lange Reihe neben Vorratstruhe und Grundstück – und bewusst in
 * einer dritten Währung: **Material**. Die Truhe kostet Münzen, das
 * Grundstück Glut, das Haus Holz und Stein. So zieht jede Währung an etwas,
 * und was man beim Roden des eigenen Grundstücks ohnehin schlägt, wandert
 * direkt in die eigenen vier Wände.
 *
 * Was jede Stufe hergibt, steht in `light` und `color`: ein Fenster, das
 * nachts leuchtet, und ein Farbkreis um das eigene Zuhause. Beides wächst
 * mit – ein Haus soll man sehen, auch wenn man nicht davorsteht.
 */

/**
 * Die Ausbaustufen.
 *
 * `cost` ist reines Material. Die Sprünge sind absichtlich groß: Das Haus
 * ist das, worauf man wochenlang hinarbeitet, nicht die nächste Bank.
 */
export const HOUSE_STAGES = [
  {
    id: 1, name: 'Das Zelt', sprite: 'tent',
    note: 'Zugig, aber deins.',
    cost: [], light: 0, color: 0,
    blockR: 72, blockH: 40, reachR: 112,
  },
  {
    id: 2, name: 'Die Hütte', sprite: 'house_2',
    note: 'Vier Wände, ein Dach und ein Fenster, das abends leuchtet.',
    cost: [{ id: 'wood', n: 40 }, { id: 'hardwood', n: 18 }, { id: 'stone', n: 15 }],
    light: 150, color: 120,
    blockR: 84, blockH: 40, reachR: 132,
  },
  {
    id: 3, name: 'Das Haus', sprite: 'house_3',
    note: 'Ein Stockwerk mehr, ein Schornstein, und der Rauch steht am Morgen.',
    cost: [{ id: 'wood', n: 90 }, { id: 'hardwood', n: 45 },
      { id: 'stone', n: 40 }, { id: 'clay', n: 20 }],
    light: 210, color: 260,
    blockR: 100, blockH: 44, reachR: 152,
  },
  {
    id: 4, name: 'Haus mit Veranda', sprite: 'house_4',
    note: 'Ein Vordach, zwei Laternen und Dielen, auf denen man abends sitzt.',
    cost: [{ id: 'hardwood', n: 110 }, { id: 'stone', n: 70 },
      { id: 'clay', n: 35 }, { id: 'copper_ore', n: 25 }],
    light: 280, color: 420,
    blockR: 122, blockH: 50, reachR: 182,
  },
];

export const MAX_HOUSE_STAGE = HOUSE_STAGES.length;

export function houseStage(n) {
  for (let i = 0; i < HOUSE_STAGES.length; i++) {
    if (HOUSE_STAGES[i].id === n) return HOUSE_STAGES[i];
  }
  return null;
}

export function nextHouseStage(stage) {
  return houseStage((stage || 1) + 1);
}

/** Welche Grafik das Zuhause auf dieser Stufe trägt. */
export function houseSprite(stage) {
  const s = houseStage(stage || 1);
  return s ? s.sprite : 'tent';
}

/** Wie weit das Fenster nachts leuchtet – 0 heißt: gar nicht. */
export function houseLight(stage) {
  const s = houseStage(stage || 1);
  return s ? s.light : 0;
}

/** Wie groß der Farbkreis um das Zuhause ist. */
export function houseColor(stage) {
  const s = houseStage(stage || 1);
  return s ? s.color : 0;
}

/**
 * Maße für die Kollision und die Reichweite.
 *
 * Gemessen an der bemalten Fläche: Das Zelt ist 324 Bildpunkte breit, das
 * Haus mit Veranda 395. Bliebe der Block der des Zelts, liefe man durch die
 * eigene Hauswand; bliebe die Reichweite die des Zelts, stünde man vor der
 * eigenen Haustür und käme nicht hinein.
 */
export function houseFootprint(stage) {
  const s = houseStage(stage || 1) || HOUSE_STAGES[0];
  return { blockR: s.blockR, blockH: s.blockH, reachR: s.reachR };
}

/**
 * Was zur nächsten Stufe noch fehlt.
 *
 * @returns {Array} [{ id, n, have }] – nur das, was fehlt
 */
export function missingFor(stage, inventory) {
  const naechste = nextHouseStage(stage);
  if (!naechste) return [];
  const out = [];
  for (let i = 0; i < naechste.cost.length; i++) {
    const c = naechste.cost[i];
    const have = inventory ? inventory.count(c.id) : 0;
    if (have < c.n) out.push({ id: c.id, n: c.n, have: have });
  }
  return out;
}

/** Reicht das Material für die nächste Stufe? */
export function canBuild(stage, inventory) {
  return !!nextHouseStage(stage) && missingFor(stage, inventory).length === 0;
}

/** Stand fürs Fenster: Stufe, Name, was als Nächstes kommt. */
export function houseStatus(stage) {
  const jetzt = houseStage(stage || 1);
  const naechste = nextHouseStage(stage);
  return {
    stufe: (stage || 1),
    name: jetzt ? jetzt.name : '',
    note: jetzt ? jetzt.note : '',
    sprite: jetzt ? jetzt.sprite : 'tent',
    naechste: naechste,
    fertig: !naechste,
  };
}
