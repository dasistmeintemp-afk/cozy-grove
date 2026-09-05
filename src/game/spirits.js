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
    colorStart: 78,
    colorPerQuest: 22,
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
    colorStart: 60,
    colorPerQuest: 26,
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
    colorStart: 60,
    colorPerQuest: 26,
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
    colorStart: 64,
    colorPerQuest: 28,
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
    colorStart: 60,
    colorPerQuest: 28,
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
    colorStart: 60,
    colorPerQuest: 30,
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

export function friendshipProgress(done) {
  return (done % 3) / 3;
}
