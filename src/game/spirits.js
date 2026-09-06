/**
 * Die Geister der Insel.
 *
 * Bewusst wortkarg: jede Figur hat nur eine Handvoll sehr kurzer Zeilen.
 * Was sie wollen, sagen Symbole – nicht Absaetze.
 */

export const SPIRITS = {
  flamey: {
    id: 'flamey',
    name: 'Flämmchen',
    art: 'spirit_flamey',
    region: 0,
    role: 'Lagerfeuer',
    colorStart: 312,
    colorPerQuest: 88,
    questTypes: ['burn', 'gather_wood', 'gather'],
    likes: ['wood', 'hardwood', 'resin'],
    lines: {
      greet: ['Knister.', 'Kalt hier.', 'Ich glimme.'],
      thanks: ['Warm!', 'Aah.', 'Besser.'],
      wait: ['Noch nicht.', 'Hm?'],
      full: ['Genug für heute.'],
    },
  },
  mira: {
    id: 'mira',
    name: 'Mira Moos',
    art: 'spirit_mira',
    region: 0,
    role: 'Wiese',
    colorStart: 240,
    colorPerQuest: 104,
    questTypes: ['gather_forage', 'find', 'decorate'],
    likes: ['flower_pink', 'flower_yellow', 'flower_white', 'herb', 'berry'],
    lines: {
      greet: ['Es duftet.', 'Hallo!', 'Schau mal.'],
      thanks: ['Wie schön.', 'Danke dir.', 'Es blüht.'],
      wait: ['Bald.', 'Ich warte.'],
      full: ['Genug für heute.'],
    },
  },
  kiesel: {
    id: 'kiesel',
    name: 'Käpt\'n Kiesel',
    art: 'spirit_kiesel',
    region: 0,
    role: 'Strand',
    colorStart: 240,
    colorPerQuest: 104,
    questTypes: ['fish', 'gather_beach', 'find'],
    likes: ['shell', 'driftwood', 'fish_cod', 'fish_mackerel'],
    lines: {
      greet: ['Moin.', 'Ruhige See.', 'Wind dreht.'],
      thanks: ['Gut gemacht.', 'Aye.', 'Das taugt.'],
      wait: ['Noch nix.', 'Geduld.'],
      full: ['Feierabend.'],
    },
  },
  bruno: {
    id: 'bruno',
    name: 'Bruno Borke',
    art: 'spirit_bruno',
    region: 1,
    role: 'Wald',
    colorStart: 256,
    colorPerQuest: 112,
    questTypes: ['gather_wood', 'find', 'gather'],
    likes: ['hardwood', 'resin', 'mushroom'],
    lines: {
      greet: ['Hmpf.', 'Du wieder.', 'Na gut.'],
      thanks: ['Passt.', 'Brauchbar.', 'Hmpf. Danke.'],
      wait: ['Nein.', 'Später.'],
      full: ['Reicht.'],
    },
  },
  tobi: {
    id: 'tobi',
    name: 'Tobi Tüftler',
    art: 'spirit_tobi',
    region: 1,
    role: 'Werkstatt',
    colorStart: 240,
    colorPerQuest: 112,
    questTypes: ['craft', 'gather_ore', 'find'],
    likes: ['copper_ore', 'stone', 'shard'],
    lines: {
      greet: ['Interessant!', 'Moment...', 'Schraube fehlt.'],
      thanks: ['Perfekt!', 'Genau das.', 'Notiert.'],
      wait: ['Noch nicht ganz.', 'Fast.'],
      full: ['Genug Material.'],
    },
  },
  nelly: {
    id: 'nelly',
    name: 'Nelly Nadel',
    art: 'spirit_nelly',
    region: 2,
    role: 'Klippen',
    colorStart: 240,
    colorPerQuest: 120,
    questTypes: ['find', 'gather', 'decorate'],
    likes: ['fiber', 'flower_violet', 'gem'],
    lines: {
      greet: ['Oh, Besuch.', 'Hier oben!', 'Puh, windig.'],
      thanks: ['Wunderbar.', 'Danke!', 'Das passt gut.'],
      wait: ['Noch nicht.', 'Ich näh derweil.'],
      full: ['Für heute reicht\'s.'],
    },
  },
};

export const SPIRIT_IDS = Object.keys(SPIRITS);

export function spiritsOfRegion(region) {
  return SPIRIT_IDS.filter(function (id) { return SPIRITS[id].region === region; });
}

/** Freundschaftsstufe aus abgeschlossenen Aufgaben. */
export function friendshipLevel(done) {
  return Math.min(10, Math.floor(done / 3));
}

/**
 * Was ein Geist zu einer neuen Freundschaftsstufe schenkt.
 *
 * Jeder Geist gibt, was zu ihm passt – Flaemmchen Glut, Kaeptn Kiesel etwas
 * vom Strand. Ab Stufe 5 kommt ein Erinnerungsstueck dazu, denn ab da hat man
 * sich wirklich Muehe gegeben. Ohne das war die Freundschaftsstufe eine Zahl,
 * die nichts bewirkte.
 */
export function friendshipGift(spiritId, level) {
  const spirit = SPIRITS[spiritId];
  if (!spirit || level < 1) return null;
  const gift = {
    coins: 20 + level * 15,
    ember: spiritId === 'flamey' ? 4 + level * 2 : 2 + level,
    items: [],
  };
  const likes = spirit.likes || [];
  if (likes.length) {
    gift.items.push({ id: likes[level % likes.length], n: 2 + Math.floor(level / 2) });
  }
  if (level >= 5) gift.items.push({ id: 'gem', n: 1 });
  return gift;
}

export function friendshipProgress(done) {
  return (done % 3) / 3;
}
