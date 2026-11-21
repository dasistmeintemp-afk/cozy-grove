/**
 * Die Insel und der echte Kalender.
 *
 * Zwei Dinge hängen am Datum des Rechners, nicht an der Spielzeit:
 *
 *   Jahreszeit    Welche Farben die Insel trägt und was gerade wächst.
 *                 Wechselt viermal im Jahr, ganz von selbst.
 *   Tagesereignis Eine Besonderheit je echtem Kalendertag. Immer genau eine,
 *                 und an etwa jedem vierten Tag gar keine.
 *
 * Warum das Datum und nicht die Uhrzeit: Ein Tag auf der Insel dauert 14
 * Minuten. Bindet man Inhalte an die echte Uhr, hat man mittags auf der Insel
 * Mitternacht im Fenster – zwei Uhren, die einander widersprechen. Und wer
 * abends spielt, käme an alles nicht heran, was am Vormittag passiert. Das
 * Datum dagegen ist grob genug: Es macht jeden Tag anders, ohne jemanden
 * auszusperren. Wer einmal die Woche spielt, erlebt jedes Mal etwas anderes.
 *
 * Alles hier ist eine reine Rechnung auf einem übergebenen Datum – deshalb
 * ohne Browser und ohne Warten prüfbar.
 */

export const SEASONS = {
  spring: { id: 'spring', name: 'Frühling', months: [2, 3, 4] },
  summer: { id: 'summer', name: 'Sommer', months: [5, 6, 7] },
  autumn: { id: 'autumn', name: 'Herbst', months: [8, 9, 10] },
  winter: { id: 'winter', name: 'Winter', months: [11, 0, 1] },
};

export const SEASON_IDS = ['spring', 'summer', 'autumn', 'winter'];

/**
 * Eine erzwungene Jahreszeit – zum Nachsehen, nicht zum Spielen.
 *
 * Der Winter kommt sonst im Winter, und wer im Juni prüfen will, ob der
 * Schnee richtig fällt, müsste die Uhr des Rechners stellen. Die Umschaltung
 * sitzt hier und nicht bei der Palette: An `seasonOf` hängen Farben, Wetter,
 * Fische und Falter gleichzeitig – zwei Schalter wären zwei Wahrheiten.
 */
let erzwungen = null;

export function forceSeason(id) {
  erzwungen = SEASONS[id] ? id : null;
  return erzwungen;
}

/** Jahreszeit zu einem Datum (Monat 0 = Januar). */
export function seasonOf(date) {
  if (erzwungen) return SEASONS[erzwungen];
  const m = (date || new Date()).getMonth();
  for (let i = 0; i < SEASON_IDS.length; i++) {
    const s = SEASONS[SEASON_IDS[i]];
    if (s.months.indexOf(m) >= 0) return s;
  }
  return SEASONS.summer;
}

/**
 * Die Tagesereignisse.
 *
 * Bewusst wenige und bewusst leise: Jedes ist EINE Regel, die man in einem
 * Satz erklären kann, und keines verlangt etwas. Ein Tag ohne Ereignis ist
 * kein leerer Tag – er ist der normale, und ohne ihn wäre das Besondere nicht
 * besonders.
 */
export const EVENTS = {
  // --- Handel ---
  market: {
    id: 'market',
    name: 'Markttag',
    hint: 'Der Händler zahlt heute ein Drittel mehr.',
    icon: 'icon_coin',
    wirkt: { handel: 1.35 },
  },
  kauffahrer: {
    id: 'kauffahrer',
    name: 'Kauffahrer',
    hint: 'Ein Schiff liegt vor der Küste. Es zahlt deutlich mehr.',
    icon: 'icon_coin_pouch',
    wirkt: { handel: 1.6 },
  },

  // --- Graben ---
  digs: {
    id: 'digs',
    name: 'Fundtag',
    hint: 'Überall auf der Insel ist frisch gegraben worden.',
    icon: 'icon_shovel',
    wirkt: { grabstellen: 2 },
  },
  grabungstag: {
    id: 'grabungstag',
    name: 'Großer Fundtag',
    hint: 'So viele Grabstellen wie selten.',
    icon: 'icon_shovel',
    wirkt: { grabstellen: 3 },
  },

  // --- Tiere ---
  moths: {
    id: 'moths',
    name: 'Falterzug',
    hint: 'Ungewöhnlich viele Falter unterwegs.',
    icon: 'icon_net',
    wirkt: { falter: true },
  },
  shoal: {
    id: 'shoal',
    name: 'Fischschwarm',
    hint: 'Ein Schwarm steht vor der Küste.',
    icon: 'icon_rod',
    wirkt: { schwarm: true },
  },

  // --- Himmel ---
  stars: {
    id: 'stars',
    name: 'Sternennacht',
    hint: 'Heute Nacht fallen Sterne. Mondblumen öffnen sich zahlreicher.',
    icon: 'icon_sparkle',
    wirkt: {
      sterne: true,
      danach: { arten: ['stardust'], boden: 'sand', n: 6, abstand: 90 },
    },
  },

  /**
   * Der Sturm ist die Gegenprobe zum Sternenhimmel – und absichtlich kein
   * Unwetter.
   *
   * „Nichts verdirbt, nichts bestraft" heißt: Ein Sturm, der die Deko umwirft
   * oder die Beete ruiniert, kommt hier nicht vor. Er zieht nachts durch, man
   * schläft hindurch, und am Morgen liegt der Saum voll. Das Wetter gibt, es
   * nimmt nie.
   */
  sturmnacht: {
    id: 'sturmnacht',
    name: 'Sturmnacht',
    hint: 'Nachts zieht ein Sturm durch. Morgen liegt der Spülsaum voll.',
    icon: 'icon_driftwood',
    wirkt: {
      danach: { arten: ['driftwood', 'shell', 'reeds'], boden: 'sand', n: 12, abstand: 70 },
    },
  },

  // --- Was die Insel hergibt ---
  pilzmorgen: {
    id: 'pilzmorgen',
    name: 'Pilzmorgen',
    hint: 'Über Nacht sind überall Pilze aufgegangen.',
    icon: 'icon_mushroom',
    wirkt: { streut: { arten: ['mushroom'], boden: 'gras', n: 9 } },
  },
  kraeutertag: {
    id: 'kraeutertag',
    name: 'Kräutertag',
    hint: 'Es riecht nach Kraut. Davon steht heute viel.',
    icon: 'icon_herb',
    wirkt: { streut: { arten: ['herb'], boden: 'gras', n: 9 } },
  },
  bloom: {
    id: 'bloom',
    name: 'Blütentag',
    hint: 'Die Insel steht in Blüte.',
    icon: 'icon_flower_pink',
    wirkt: {
      streut: {
        arten: ['flower_pink', 'flower_yellow', 'flower_violet', 'flower_white'],
        boden: 'gras', n: 10,
      },
    },
  },
  federflug: {
    id: 'federflug',
    name: 'Federflug',
    hint: 'Irgendwo ist ein Schwarm aufgestiegen. Federn liegen herum.',
    icon: 'icon_feather',
    wirkt: { streut: { arten: ['feather'], boden: 'gras', n: 8 } },
  },
  wiesentag: {
    id: 'wiesentag',
    name: 'Hohes Gras',
    hint: 'Das Gras steht hoch. Fasern, soviel man tragen kann.',
    icon: 'icon_fiber',
    wirkt: { streut: { arten: ['grass_tuft'], boden: 'gras', n: 10 } },
  },
  mondblumen: {
    id: 'mondblumen',
    name: 'Mondblumennacht',
    hint: 'Die Mondblumen stehen dicht heute.',
    icon: 'icon_moonflower',
    wirkt: { streut: { arten: ['moonflower'], boden: 'gras', n: 8 } },
  },

  // --- Was das Wasser bringt ---
  muschelsaum: {
    id: 'muschelsaum',
    name: 'Muschelsaum',
    hint: 'Die Flut hat Muscheln dagelassen.',
    icon: 'icon_shell',
    wirkt: { streut: { arten: ['shell'], boden: 'sand', n: 11, abstand: 70 } },
  },
  strandgut: {
    id: 'strandgut',
    name: 'Strandgut',
    hint: 'Treibholz liegt am ganzen Saum.',
    icon: 'icon_driftwood',
    wirkt: { streut: { arten: ['driftwood'], boden: 'sand', n: 9, abstand: 70 } },
  },
  schilfsaum: {
    id: 'schilfsaum',
    name: 'Schilfsaum',
    hint: 'Am Wasser steht das Schilf dicht.',
    icon: 'icon_fiber',
    wirkt: { streut: { arten: ['reeds'], boden: 'sand', n: 9, abstand: 70 } },
  },

  /**
   * Der einzige Tag, der auf dem Fels streut.
   *
   * Steht hier, weil er etwas anderes tut als die übrigen: Er macht einen
   * ORT wieder wichtig. Das Hochland besucht man, bis die Geoden geholt
   * sind, und danach nie wieder – ein Tag, an dem dort etwas wächst, gibt
   * dem Weg nach oben einen Grund, ohne dass dort etwas Neues stehen muss.
   */
  steinkraut: {
    id: 'steinkraut',
    name: 'Steinkraut',
    hint: 'Im Hochland blüht es zwischen den Felsen.',
    icon: 'icon_herb',
    // Ohne offenes Hochland gibt es diesen Tag nicht – siehe `taugtHeute`.
    braucht: 'fels',
    wirkt: { streut: { arten: ['herb', 'flower_white'], boden: 'fels', n: 8 } },
  },

  /**
   * Vier Tage, die es nur in ihrer Jahreszeit gibt – je einer.
   *
   * Zwei Gründe. Erstens macht es die Jahreszeiten voneinander
   * unterscheidbar: Ein Blütenschnee IST der Frühling, und wer im Januar
   * spielt, bekommt ihn nicht. Zweitens verschenken sie genau die vier
   * Jahresgaben, die man sonst suchen muss – der Tag ist also nicht nur ein
   * anderer Name, sondern der ergiebigste Tag des Jahres für dieses Stück.
   *
   * Wichtig: `nur` verkleinert den Vorrat an Ereignissen pro Jahreszeit
   * nicht spürbar, weil nur vier der Ereignisse gebunden sind. Siehe
   * `eventOf` und den Test, der beides nachrechnet.
   */
  bluetenschnee: {
    id: 'bluetenschnee', nur: 'spring',
    name: 'Blütenschnee',
    hint: 'Die Luft ist voller Blütenblätter.',
    icon: 'icon_petal',
    wirkt: { streut: { arten: ['petal'], boden: 'gras', n: 11 } },
  },
  sonnensteine: {
    id: 'sonnensteine', nur: 'summer',
    name: 'Sonnensteine',
    hint: 'Der heiße Sand gibt Sonnensteine her.',
    icon: 'icon_sunstone',
    wirkt: { streut: { arten: ['sunstone'], boden: 'sand', n: 9, abstand: 70 } },
  },
  laubfall: {
    id: 'laubfall', nur: 'autumn',
    name: 'Laubfall',
    hint: 'Der Wald wirft sein Laub ab.',
    icon: 'icon_mapleleaf',
    wirkt: { streut: { arten: ['mapleleaf'], boden: 'gras', n: 11 } },
  },
  frostblueten: {
    id: 'frostblueten', nur: 'winter',
    name: 'Frostblüten',
    hint: 'Über Nacht ist alles angefroren. Eisblumen überall.',
    icon: 'icon_frostflower',
    wirkt: { streut: { arten: ['frostflower'], boden: 'gras', n: 9 } },
  },
};

export const EVENT_IDS = Object.keys(EVENTS);

/** Tagesnummer seit dem 1. Januar 1970, in Ortszeit. */
export function dayNumber(date) {
  const d = date || new Date();
  // Über Jahr/Monat/Tag statt über die Millisekunden: Sommerzeit verschiebt
  // sonst zweimal im Jahr die Tagesgrenze, und ein Tag wäre 23 oder 25
  // Stunden lang – dann bekäme man ein Ereignis doppelt oder gar nicht.
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}

/**
 * Eine gleichmäßig streuende Zahl aus der Tagesnummer.
 *
 * Muss auf jedem Rechner dieselbe sein: Zwei Leute, die am selben Tag
 * spielen, sollen dasselbe erleben – das ist der halbe Reiz daran.
 */
function hashDay(n) {
  let h = (n ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Aus Kalendertag UND Inseltag eine Zahl.
 *
 * Hier lag ein Fehler, den man erst beim Spielen merkt: Das Ereignis hing
 * allein am Datum des Rechners. Ein Inseltag dauert aber vierzehn Minuten –
 * wer einen Nachmittag spielt, schläft dreißigmal und hatte dreißigmal
 * denselben Falterzug. Gemessen: 30 Inseltage an einem echten Tag ergaben
 * GENAU EIN Ereignis, und die anderen fünf bekam man an diesem Tag nie zu
 * sehen.
 *
 * Der Inseltag gehört also dazu. Was dabei erhalten bleibt: Zwei Leute, die
 * am selben Kalendertag an ihrem Tag 7 stehen, erleben dasselbe – die
 * Inselzahl steckt bewusst NICHT mit drin. Das war der Reiz am Datum, und
 * der geht so nicht verloren.
 */
function tagesZahl(date, tag) {
  return hashDay(dayNumber(date) ^ Math.imul(tag | 0, 0x27d4eb2d));
}

/**
 * Das Ereignis eines Tages – oder null.
 *
 * Etwa jeder vierte Tag bleibt bewusst ohne. Ein Spiel, in dem jeden Tag
 * etwas Besonderes ist, hat nichts Besonderes mehr.
 *
 * @param {Date} date  der Kalendertag
 * @param {number} tag der Inseltag – ohne ihn wechselt nichts vor Mitternacht
 */
export function eventOf(date, tag) {
  const d = date || new Date();
  const h = tagesZahl(d, tag);
  if ((h & 3) === 0) return null;
  const vorrat = vorratFuer(seasonOf(d).id);
  return EVENTS[vorrat[(h >>> 4) % vorrat.length]];
}

/**
 * Welche Ereignisse in dieser Jahreszeit überhaupt vorkommen.
 *
 * Vier der Ereignisse tragen ein `nur` und gehören einer Jahreszeit. Der
 * Vorrat wird je Jahreszeit EINMAL gerechnet und gemerkt: `eventOf` läuft in
 * der Oberfläche mehrmals je Bild, und eine Filterung über alle Ereignisse
 * bei jedem Aufruf wäre Arbeit für ein Ergebnis, das sich nie ändert.
 */
const VORRAT = Object.create(null);

export function vorratFuer(jahreszeit) {
  if (VORRAT[jahreszeit]) return VORRAT[jahreszeit];
  VORRAT[jahreszeit] = EVENT_IDS.filter(function (id) {
    const nur = EVENTS[id].nur;
    return !nur || nur === jahreszeit;
  });
  return VORRAT[jahreszeit];
}

/** Welcher Fisch heute im Schwarm steht (Index in einen Vorrat). */
export function shoalIndex(date, poolSize, tag) {
  if (!poolSize) return 0;
  return (tagesZahl(date, tag) >>> 9) % poolSize;
}

/** Kurzfassung für die Oberfläche: Jahreszeit und, falls vorhanden, Ereignis. */
export function todayOf(date, tag) {
  const d = date || new Date();
  return { season: seasonOf(d), event: eventOf(d, tag), day: dayNumber(d), tag: tag | 0 };
}
