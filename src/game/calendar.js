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
  market: {
    id: 'market',
    name: 'Markttag',
    hint: 'Der Händler zahlt heute ein Drittel mehr.',
    icon: 'icon_coin',
  },
  digs: {
    id: 'digs',
    name: 'Fundtag',
    hint: 'Überall auf der Insel ist frisch gegraben worden.',
    icon: 'icon_shovel',
  },
  bloom: {
    id: 'bloom',
    name: 'Blütentag',
    hint: 'Die Insel steht in Blüte.',
    icon: 'icon_flower_pink',
  },
  moths: {
    id: 'moths',
    name: 'Falterzug',
    hint: 'Ungewöhnlich viele Falter unterwegs.',
    icon: 'icon_net',
  },
  shoal: {
    id: 'shoal',
    name: 'Fischschwarm',
    hint: 'Ein Schwarm steht vor der Küste.',
    icon: 'icon_rod',
  },
  stars: {
    id: 'stars',
    name: 'Sternennacht',
    hint: 'Heute Nacht fallen Sterne. Mondblumen öffnen sich zahlreicher.',
    icon: 'icon_sparkle',
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
 * Das Ereignis eines Kalendertags – oder null.
 *
 * Etwa jeder vierte Tag bleibt bewusst ohne. Ein Spiel, in dem jeden Tag
 * etwas Besonderes ist, hat nichts Besonderes mehr.
 */
export function eventOf(date) {
  const h = hashDay(dayNumber(date));
  if ((h & 3) === 0) return null;
  return EVENTS[EVENT_IDS[(h >>> 4) % EVENT_IDS.length]];
}

/** Welcher Fisch heute im Schwarm steht (Index in einen Vorrat). */
export function shoalIndex(date, poolSize) {
  if (!poolSize) return 0;
  return (hashDay(dayNumber(date)) >>> 9) % poolSize;
}

/** Kurzfassung für die Oberfläche: Jahreszeit und, falls vorhanden, Ereignis. */
export function todayOf(date) {
  const d = date || new Date();
  return { season: seasonOf(d), event: eventOf(d), day: dayNumber(d) };
}
