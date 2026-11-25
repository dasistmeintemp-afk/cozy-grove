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
  /**
   * Der Windbaum am Ufer.
   *
   * Er steht nur dort, wo das Wasser anfängt, und er gibt WENIGER Holz
   * als die Eiche im Wald, nicht mehr. Sonst wäre aus einer Beobachtung
   * über die Küste ein Grund geworden, nur noch dort zu fällen – und das
   * Ufer ist das Erste, was man sieht, wenn man ankommt.
   */
  tree_wind: {
    sprite: 'tree_wind', variants: 3, solid: true, blockR: 22, reachR: 88, tool: TOOL.AXE, hits: 3,
    yield: function (level, rng) {
      const out = [{ id: 'wood', n: randInt(rng, 1, 2) + level }];
      if (rng() < 0.4) out.push({ id: 'resin', n: 1 });
      return out;
    },
    becomes: 'tree_stump', respawn: 3, sway: true, category: 'tree',
  },
  /**
   * Eine Landmarke – Wrack, Steinkreis, Leuchtturm.
   *
   * Sie ist fest und nicht abbaubar: Eine Landmarke, die man wegräumen
   * kann, ist Deko. Der ganze Sinn ist, dass sie bleibt, wo sie ist, und
   * dass man sich an ihr orientiert.
   *
   * `sprite` und `blockR` stehen je Stück auf der Instanz, nicht hier:
   * Das Wrack ist dreimal so breit wie der Torbogen, und ein gemeinsamer
   * Wert wäre für beide falsch.
   */
  marke: {
    sprite: 'marke_steinkreis', solid: true, blockR: 70, blockH: 34,
    reachR: 150, tool: null, category: 'marke',
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
    sprite: 'rock_small', variants: 3, solid: true, blockR: 20, reachR: 72, tool: TOOL.PICK, hits: 1,
    yield: drop('stone', 1, 2), respawn: 1, category: 'rock',
  },
  /**
   * Die Kristallader – nur in der Höhle.
   *
   * Sie ist die Antwort auf einen echten Fehler: Die erste Höhle enthielt
   * Erz, Granit und eine Geode, und alle drei brauchen die Spitzhacke
   * ab Stufe 2, 3 beziehungsweise 4. Wer am ersten Tag hineinging, konnte
   * NICHTS davon anrühren – eine Prüfung hat es gefunden, weil sie mit
   * der Anfangsausrüstung geschlagen hat statt mit einer gedachten.
   *
   * Die Ader geht mit der ersten Spitzhacke. Damit hat die Höhle etwas
   * für den ersten Besuch und etwas für später, und beides ist dasselbe
   * Werkzeug auf verschiedenen Stufen.
   */
  kristallader: {
    sprite: 'kristallader', solid: true, blockR: 30, reachR: 84,
    tool: TOOL.PICK, minLevel: 1, hits: 3,
    yield: function (level, rng) {
      const out = [
        { id: 'hoehlenkristall', n: 1 },
        { id: 'stone', n: randInt(rng, 1, 2) },
      ];
      if (level >= 3 && rng() < 0.3) out.push({ id: 'hoehlenkristall', n: 1 });
      return out;
    },
    respawn: 3, category: 'rock',
  },

  /** Leuchtmoos an der Höhlenwand – mit der Hand, wie jedes Kraut. */
  leuchtmoos: {
    sprite: 'leuchtmoos', solid: false, reachR: 64, tool: TOOL.HAND, hits: 1,
    yield: drop('leuchtmoos', 1, 2), respawn: 1, sway: true, category: 'forage',
    // Es leuchtet wirklich: in der Höhle der einzige eigene Lichtpunkt.
    light: 90,
  },

  /** Der Mehlsack in der Mühle. */
  mehlsack: {
    sprite: 'mehlsack', solid: false, reachR: 72, tool: TOOL.HAND, hits: 1,
    yield: drop('mehl', 1, 2), respawn: 1, category: 'forage',
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
    sprite: 'bush_berry', variants: 3, solid: true, blockR: 24, reachR: 72, tool: TOOL.HAND, hits: 1,
    yield: drop('berry', 1, 2), becomes: 'bush_plain', respawn: 1, sway: true, category: 'forage',
  },
  bush_plain: { sprite: 'bush_plain', variants: 3, solid: true, blockR: 24, reachR: 64, tool: null, sway: true, category: 'bush' },

  reeds: {
    sprite: 'reeds', variants: 3, solid: false, reachR: 64, tool: TOOL.HAND, hits: 1,
    yield: drop('fiber', 1, 2), respawn: 1, sway: true, category: 'forage',
  },
  grass_tuft: {
    sprite: 'grass_tuft', variants: 4, solid: false, reachR: 56, tool: TOOL.HAND, hits: 1,
    yield: drop('fiber', 1, 1), respawn: 1, sway: true, category: 'forage',
  },
  /**
   * Der Farn.
   *
   * Erntbar wie Kraut und mit demselben Ertrag: Er ist die Pflanze, an
   * der man den Sumpf erkennt, und eine Pflanze, die man nur ansehen
   * darf, ist Deko. Dass er dasselbe gibt wie Kraut, ist Absicht – eine
   * neue Zutat nur für ein neues Biom wäre eine Rezeptliste mehr, ohne
   * dass irgendwo etwas Neues entstünde.
   */
  farn: {
    sprite: 'farn', variants: 3, solid: false, reachR: 58, tool: TOOL.HAND, hits: 1,
    yield: drop('fiber', 1, 2), respawn: 1, sway: true, category: 'forage',
  },
  mushroom: {
    sprite: 'mushroom', variants: 3, solid: false, reachR: 56, tool: TOOL.HAND, hits: 1,
    yield: drop('mushroom', 1, 1), respawn: 1, category: 'forage',
  },
  herb: {
    sprite: 'herb', variants: 3, solid: false, reachR: 56, tool: TOOL.HAND, hits: 1,
    yield: drop('herb', 1, 1), respawn: 1, sway: true, category: 'forage',
  },
  shell: {
    sprite: 'shell', variants: 3, solid: false, reachR: 56, tool: TOOL.HAND, hits: 1,
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
  flower_pink: { sprite: 'flower_pink', variants: 3, solid: false, reachR: 56, tool: TOOL.HAND, hits: 1, yield: drop('flower_pink', 1, 1), respawn: 1, sway: true, category: 'forage' },
  flower_yellow: { sprite: 'flower_yellow', variants: 3, solid: false, reachR: 56, tool: TOOL.HAND, hits: 1, yield: drop('flower_yellow', 1, 1), respawn: 1, sway: true, category: 'forage' },
  flower_violet: { sprite: 'flower_violet', variants: 3, solid: false, reachR: 56, tool: TOOL.HAND, hits: 1, yield: drop('flower_violet', 1, 1), respawn: 1, sway: true, category: 'forage' },
  flower_white: { sprite: 'flower_white', variants: 3, solid: false, reachR: 56, tool: TOOL.HAND, hits: 1, yield: drop('flower_white', 1, 1), respawn: 1, sway: true, category: 'forage' },

  // Wetter- und Nachtvorkommen. Sie werden jeden Tag neu gesetzt und
  // verschwinden wieder, sobald die Bedingung nicht mehr gilt.
  moonflower: {
    sprite: 'moonflower', solid: false, reachR: 60, tool: TOOL.HAND, hits: 1,
    yield: drop('moonflower', 1, 1), sway: true, category: 'forage',
  },

  /**
   * Die vier Jahresgaben – je eine Jahreszeit.
   *
   * Genau wie die Mondblume darüber gebaut: `syncConditional` legt sie aus,
   * solange die Bedingung gilt, und räumt sie weg, wenn sie fällt. Kein
   * `respawn`, weil sie gar nicht erst nachwachsen müssen – es kommen
   * einfach am nächsten Tag neue.
   */
  /**
   * Ein Setzling. Er waechst ueber Tage und wird dann ein gewoehnlicher Baum
   * (siehe `game/saplings.js`).
   *
   * `tool: HAND` und ein Treffer: Wer ihn versehentlich gesetzt hat, soll
   * ihn wieder aufheben koennen, ohne die Axt zu holen. Die Ausbeute traegt
   * `game.js` nach - sie haengt an der Sorte, und die steht am Objekt.
   */
  sapling: {
    sprite: 'sapling_oak_0', solid: false, reachR: 64, tool: TOOL.HAND, hits: 1,
    sway: true, category: 'sapling',
  },

  petal: {
    sprite: 'petal', solid: false, reachR: 56, tool: TOOL.HAND, hits: 1,
    yield: drop('petal', 1, 2), sway: true, category: 'forage',
  },
  sunstone: {
    sprite: 'sunstone', solid: false, reachR: 56, tool: TOOL.HAND, hits: 1,
    yield: drop('sunstone', 1, 1), category: 'forage',
  },
  mapleleaf: {
    sprite: 'mapleleaf', solid: false, reachR: 56, tool: TOOL.HAND, hits: 1,
    yield: drop('mapleleaf', 1, 2), sway: true, category: 'forage',
  },
  frostflower: {
    sprite: 'frostflower', solid: false, reachR: 56, tool: TOOL.HAND, hits: 1,
    yield: drop('frostflower', 1, 1), category: 'forage',
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
   * Die Eingänge, durch die man in einen Innenort geht.
   *
   * Beide sind FEST: Man läuft nicht durch einen Felsvorsprung hindurch
   * und nicht durch eine Tür, ohne sie zu benutzen. Der Blockradius ist
   * schmaler als das Bild – sonst stünde man zum Hineingehen zu weit weg
   * und der Hinweis erschiene nie.
   */
  hoehle_eingang: {
    sprite: 'hoehle_eingang', solid: true, blockR: 46, blockH: 20,
    reachR: 116, category: 'station', station: 'hoehle', priority: 40,
  },
  muehle_tuer: {
    sprite: 'muehle_tuer', solid: true, blockR: 26, blockH: 12,
    reachR: 104, category: 'station', station: 'muehle', priority: 40,
  },
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

  // Jule, die Nachbarin. Sie sitzt, deshalb ist sie flacher als der
  // Wanderer – und sie ist NICHT solide: Wer über ihre Beine stolpert,
  // nimmt ihr das Gemütliche.
  nachbar: { sprite: 'nachbar_0', solid: false, reachR: 120, category: 'nachbar' },

  // Die Tanne, die im Dezember am Lager steht. Solide wie jeder Baum – wer
  // hindurchliefe, hätte keinen Baum vor sich, sondern ein Bild. Dafür ein
  // großzügiger Griffradius: Sie ist breit, und das Türchen soll sich von
  // jeder Seite öffnen lassen, ohne dass man erst um sie herumgeht.
  tanne: { sprite: 'tanne_0', solid: true, blockR: 30, reachR: 110, category: 'tanne' },

  // Die Bewohner und ihre Hütten. Wie Jule sind die Figuren NICHT solide:
  // Wer um einen Nachbarn herumlaufen muss, geht ihm aus dem Weg statt zu
  // ihm hin. Die Hütte dagegen ist ein Haus und bleibt eines.
  bewohner: { sprite: 'bewohner_hilde_0', solid: false, reachR: 120, category: 'bewohner' },
  hutte: { sprite: 'hutte_hilde', solid: true, blockR: 52, reachR: 90, category: 'hutte' },
  // Was morgens vor der Tür liegt.
  gabe: { sprite: 'paket', solid: false, reachR: 80, category: 'gabe' },

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
    /**
     * Die Felder, die nur manche Objekte brauchen, stehen trotzdem HIER.
     *
     * Das ist kein Schönheitsfehler, sondern eine Messung. JavaScript-
     * Maschinen ordnen Objekte nach ihrer Bauform; wer einem fertigen
     * Objekt nachträglich ein Feld anhängt, erzeugt eine zweite Bauform.
     * Sobald dieselbe Schleife beide Formen sieht, kann sie die
     * Feldzugriffe nicht mehr vorab auflösen – und die Zeichenschleife
     * sieht jedes Bild alle sichtbaren Objekte.
     *
     * Gemessen: Sieben Landmarken, denen `markeId` und `blockR`
     * nachträglich angehängt wurden, kosteten acht Bilder je Sekunde
     * (35 auf 27) – unabhängig davon, wie groß ihre Grafik war und ob
     * sie überhaupt eine Kollision hatten. Mit einer Grafik von der
     * Größe eines Kiesels blieb es bei 24. Sieben Objekte können nicht
     * acht Bilder kosten; die Bauform kann es.
     *
     * Wer hier ein Feld ergänzt, zahlt vier Bytes je Objekt. Wer es
     * weglässt und später anhängt, zahlt die halbe Bildrate.
     */
    gone: false,
    blockR: null,
    blockH: null,
    markeId: null,
    lehnt: 0,
    origin: null,
  };
  if (extra) for (const k in extra) e[k] = extra[k];
  return e;
}

/** Sortierschlüssel für die Tiefenstaffelung. */
export function sortKey(e) {
  return e.y + (e.zBias || 0);
}
