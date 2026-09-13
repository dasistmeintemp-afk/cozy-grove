/**
 * Die Geister der Insel.
 *
 * Bewusst wortkarg: jede Figur hat nur eine Handvoll sehr kurzer Zeilen.
 * Was sie wollen, sagen Symbole – nicht Absätze.
 *
 * `colorStart` ist der Radius, mit dem sein Farbkreis beginnt; `colorArea` die
 * FLÄCHE in Pixeln, die eine erfüllte Bitte dazu einfärbt. Vorher stand hier
 * ein Radiuszuwachs – damit färbte der hundertste Auftrag ein Vielfaches
 * dessen ein, was der erste einfärbte, und die Anzeige stand nach zwei Wochen
 * auf hundert Prozent. Siehe `ColorField.growByArea`.
 */

export const SPIRITS = {
  flamey: {
    id: 'flamey',
    geburtstag: { monat: 10, tag: 7 },
    name: 'Flämmchen',
    art: 'spirit_flamey',
    region: 0,
    role: 'Lagerfeuer',
    colorStart: 312,
    colorArea: 131000,
    // 'cook': Die Kochstelle steht neben seinem Feuer – er sieht jedes Mal zu.
    questTypes: ['burn', 'burn', 'gather_wood', 'visit', 'craft', 'cook', 'set', 'deliver'],
    likes: ['wood', 'hardwood', 'resin'],
    favourite: 'resin',
    lines: {
      greet: ['Knister.', 'Kalt hier.', 'Ich glimme.'],
      thanks: ['Warm!', 'Aah.', 'Besser.'],
      wait: ['Noch nicht.', 'Hm?'],
      full: ['Genug für heute.'],
    },
  },
  mira: {
    id: 'mira',
    geburtstag: { monat: 3, tag: 21 },
    name: 'Mira Moos',
    art: 'spirit_mira',
    region: 0,
    role: 'Wiese',
    colorStart: 240,
    colorArea: 127000,
    // 'cook': Bei ihr auf der Wiese wächst fast alles, was in den Topf kommt.
    questTypes: ['gather_forage', 'find', 'decorate', 'catch_bug', 'visit', 'cook', 'set', 'grow', 'deliver'],
    // Die Dämmerblume gehört zu ihr: Sie ist die Blumenfrau der Insel, und
    // die eine Blume, die man nicht findet, sondern zieht, gehört in ihre
    // Hände. Ohne das wäre der seltenste Fund des Gartens nur Geld.
    likes: ['flower_pink', 'flower_yellow', 'flower_white', 'herb', 'berry', 'flower_dusk'],
    favourite: 'flower_white',
    lines: {
      greet: ['Es duftet.', 'Hallo!', 'Schau mal.'],
      thanks: ['Wie schön.', 'Danke dir.', 'Es blüht.'],
      wait: ['Bald.', 'Ich warte.'],
      full: ['Genug für heute.'],
    },
  },
  kiesel: {
    id: 'kiesel',
    geburtstag: { monat: 8, tag: 2 },
    name: 'Käpt\'n Kiesel',
    art: 'spirit_kiesel',
    region: 0,
    role: 'Strand',
    water: 'sea',
    colorStart: 240,
    colorArea: 127000,
    questTypes: ['catch', 'catch', 'fish', 'gather_beach', 'visit', 'set', 'deliver'],
    likes: ['shell', 'driftwood', 'fish_cod', 'fish_mackerel'],
    favourite: 'fish_cod',
    lines: {
      greet: ['Moin.', 'Ruhige See.', 'Wind dreht.'],
      thanks: ['Gut gemacht.', 'Aye.', 'Das taugt.'],
      wait: ['Noch nix.', 'Geduld.'],
      full: ['Feierabend.'],
    },
  },
  bruno: {
    id: 'bruno',
    geburtstag: { monat: 1, tag: 14 },
    name: 'Bruno Borke',
    art: 'spirit_bruno',
    region: 1,
    role: 'Wald',
    water: 'fresh',
    colorStart: 256,
    colorArea: 146000,
    questTypes: ['gather_wood', 'find', 'visit', 'catch_bug', 'burn', 'set', 'grow', 'deliver'],
    likes: ['hardwood', 'resin', 'mushroom'],
    favourite: 'hardwood',
    lines: {
      greet: ['Hmpf.', 'Du wieder.', 'Na gut.'],
      thanks: ['Passt.', 'Brauchbar.', 'Hmpf. Danke.'],
      wait: ['Nein.', 'Später.'],
      full: ['Reicht.'],
    },
  },
  tobi: {
    id: 'tobi',
    geburtstag: { monat: 5, tag: 30 },
    name: 'Tobi Tüftler',
    art: 'spirit_tobi',
    region: 1,
    role: 'Werkstatt',
    colorStart: 240,
    colorArea: 139000,
    questTypes: ['craft', 'craft', 'gather_ore', 'visit', 'decorate', 'set', 'deliver'],
    likes: ['copper_ore', 'stone', 'shard'],
    favourite: 'shard',
    lines: {
      greet: ['Interessant!', 'Moment...', 'Schraube fehlt.'],
      thanks: ['Perfekt!', 'Genau das.', 'Notiert.'],
      wait: ['Noch nicht ganz.', 'Fast.'],
      full: ['Genug Material.'],
    },
  },
  nelly: {
    id: 'nelly',
    geburtstag: { monat: 0, tag: 19 },
    name: 'Nelly Nadel',
    art: 'spirit_nelly',
    region: 2,
    role: 'Klippen',
    colorStart: 240,
    colorArea: 151000,
    // 'cook': „Ich habe für alle gedeckt. Auch für die, die nicht kommen."
    questTypes: ['find', 'visit', 'decorate', 'craft', 'gather', 'cook', 'set', 'grow', 'deliver'],
    // Bernstein dazu: Sie wohnt oben am Stein, ihr Lieblingsstück ist der
    // Meerkristall, und der Bernstein kommt aus den Geoden im Hochland.
    likes: ['fiber', 'flower_violet', 'gem', 'amber'],
    favourite: 'gem',
    lines: {
      greet: ['Oh, Besuch.', 'Hier oben!', 'Puh, windig.'],
      thanks: ['Wunderbar.', 'Danke!', 'Das passt gut.'],
      wait: ['Noch nicht.', 'Ich näh derweil.'],
      full: ['Für heute reicht\'s.'],
    },
  },
  wanda: {
    id: 'wanda',
    geburtstag: { monat: 6, tag: 11 },
    name: 'Wanda Watt',
    art: 'spirit_wanda',
    region: 3,
    role: 'Stille Insel',
    // Ihr Kreis beginnt größer als bei allen anderen: Sie ist allein auf
    // ihrer Insel, und ein winziger Farbfleck im Nichts sähe verloren aus.
    colorStart: 360,
    colorArea: 158000,
    // 'cook': Sie ist allein auf ihrer Insel. Jemand, der ihr etwas Warmes
    // hinüberbringt, ist das Freundlichste, was das Spiel zu bieten hat.
    questTypes: ['find', 'catch_bug', 'gather_beach', 'fish', 'visit', 'cook', 'set', 'deliver', 'grow'],
    // Sternenstaub gehört zu ihr: Er liegt am Morgen nach einer Sternennacht
    // am Spülsaum, und Wanda ist die, die nachsieht, was über Nacht angetrieben
    // ist. Vorher mochte ihn NIEMAND – der seltenste Fund des Spiels war das
    // einzige, was man nicht verschenken konnte.
    likes: ['shell', 'driftwood', 'bottle', 'moonflower', 'stardust'],
    favourite: 'moonflower',
    lines: {
      greet: ['Wer rudert denn da?', 'Still hier, nicht?', 'Ich zähle Wellen.'],
      thanks: ['Oh, schön.', 'Das hebe ich auf.', 'Danke, wirklich.'],
      wait: ['Ich warte gern.', 'Noch nicht.'],
      full: ['Genug für heute.'],
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
 * Jeder Geist gibt, was zu ihm passt – Flämmchen Glut, Käptn Kiesel etwas
 * vom Strand. Ab Stufe 5 kommt ein Erinnerungsstück dazu, denn ab da hat man
 * sich wirklich Mühe gegeben. Ohne das war die Freundschaftsstufe eine Zahl,
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

/**
 * Das eine Stück, über das sich ein Geist besonders freut.
 *
 * Vorher war jedes gemochte Ding gleich viel wert: Man warf hin, was gerade
 * oben in der Tasche lag, und die Glut hing allein am Verkaufswert. Mit
 * einem Lieblingsstück wird aus dem Mitbringsel eine Entscheidung – und aus
 * „irgendwas Grünes" wird „Mira mag Sternblumen".
 */
export function favouriteOf(spiritId) {
  const s = SPIRITS[spiritId];
  return (s && s.favourite) || null;
}

/**
 * Wer heute Geburtstag hat – oder null.
 *
 * Am echten Kalender, wie die Jahreszeiten und die Tagesereignisse. Das ist
 * die eine Sorte Termin, die man nicht verpassen kann, weil man sie nicht
 * herbeispielen kann: Er kommt, wenn er kommt.
 *
 * Sieben Geburtstage über sieben Monate verteilt – nicht über zwölf, denn
 * dann wären Monate ohne, und nicht gedrängt, denn dann käme alles auf
 * einmal. Im Mittel alle sieben Wochen einer.
 */
export function birthdayOn(date) {
  const d = date || new Date();
  const m = d.getMonth();
  const t = d.getDate();
  for (let i = 0; i < SPIRIT_IDS.length; i++) {
    const s = SPIRITS[SPIRIT_IDS[i]];
    if (s.geburtstag && s.geburtstag.monat === m && s.geburtstag.tag === t) return s;
  }
  return null;
}

/** Hat dieser Geist heute Geburtstag? */
export function hasBirthday(spiritId, date) {
  const s = birthdayOn(date);
  return !!(s && s.id === spiritId);
}

/**
 * Was ein Geschenk am Geburtstag zusätzlich zählt.
 *
 * Dreifach, und das ist mit Absicht viel: Ein Geburtstag, an dem sich
 * nichts ändert, ist ein Datum. Es gibt ihn je Geist einmal im Jahr – wer
 * ihn trifft, soll das Gefühl haben, etwas gefunden zu haben, das man nicht
 * kaufen kann.
 */
export const GEBURTSTAG_FAKTOR = 3;

export function isFavourite(spiritId, itemId) {
  return !!itemId && favouriteOf(spiritId) === itemId;
}
