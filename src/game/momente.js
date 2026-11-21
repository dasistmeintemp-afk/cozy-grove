/**
 * Benannte Momente – der multiplikative Brunnen.
 *
 * Das Spiel hat 28 Erzählschritte (sieben Geister mit je vier), und das ist
 * die ganze geschriebene Geschichte. Gleichzeitig kann Seli in rund 1764
 * unterscheidbaren Lagen stehen: sieben Orte × vier Tageszeiten × vier
 * Jahreszeiten × vier Wetterlagen, und das Tagesereignis dazu. Das Spiel
 * benannte davon **keine einzige**.
 *
 * Darauf beruht diese Datei, und auf einem Satz, den die Wunschplätze teuer
 * bewiesen haben:
 *
 *   Prozedur erzeugt unendliche Aktivität und null Neuheit.
 *
 * Die Wunschplätze sind ein unbegrenzter Generator – und genau sie fühlen
 * sich nach einer Weile leer an, weil sie dieselben 128 Dinge neu mischen.
 * Zufällige Abwandlung ist Rauschen. Was eine Kombination zu *Inhalt* macht,
 * ist, dass das Spiel sie **benennt** und darauf **reagiert**. Nebel am
 * Herbstabend an den Klippen ist heute nichts; mit einem Namen und einem
 * Satz, der einmal fällt und in der Chronik stehen bleibt, ist es ein Fund.
 * Dieselben Teile, die ohnehin schon da sind.
 *
 * **Fünf Regeln.**
 *
 * 1. **Einmal im Spielleben.** Ein Satz, der bei jeder passenden Lage wieder
 *    kommt, ist Beiwerk und wird schal. Einmal und dann aufgeschrieben – das
 *    ist ein Fund.
 * 2. **Er gibt nichts.** Kein Gegenstand, keine Münze, keine Glut. Ein
 *    Moment mit Beute wäre sofort eine Aufgabe, und dann stünde man mit dem
 *    Wetterbericht in der Hand am Klippenrand und wartete. Er ist eine
 *    Beobachtung, keine Ausbeute.
 * 3. **Man kann ihn nicht verfehlen.** Die Bedingungen kehren wieder –
 *    Jahreszeiten drehen sich, Wetter kommt wieder, Orte bleiben liegen.
 *    Nichts läuft ab.
 * 4. **Man sucht ihn nicht.** Es gibt keine Liste des Fehlenden und keinen
 *    Hinweis, wo einer wartet. Seli bemerkt etwas, wenn sie dort steht. Eine
 *    Fundliste mit Lücken wäre eine Aufgabenliste mit anderem Namen.
 * 5. **Höchstens einer am Tag.** Sonst schüttet eine lange Sitzung zehn
 *    Momente auf einmal aus, und der zehnte ist nichts mehr wert.
 *
 * Die Lage kommt aus `ruheLage()` – derselben Quelle, aus der Seli ihre
 * Gedanken und ihre Skizzen nimmt. Ein zweiter Ortsbegriff daneben wäre die
 * Sorte Doppelung, die irgendwann auseinanderläuft.
 */
import { ortAus, zeitAus } from './bild.js';

/**
 * Wie oft eine Bedingung etwa zutrifft – für die gerechnete Seltenheit.
 *
 * Das sind absichtlich grobe Zahlen, und sie sollen auch nur eine Sache
 * leisten: die Momente in eine Reihenfolge bringen, damit `waehleMoment` den
 * seltensten zuerst nimmt und ein Test nachrechnen kann, dass die Sammlung
 * eine Spreizung hat. Ohne diese Spreizung wäre entweder in Woche eins alles
 * gefunden oder in Woche eins nichts – und beides ist dasselbe Problem.
 *
 * `ereignis` ist mit Abstand die seltenste Bedingung: Es gibt über zwanzig
 * Ereignisse, und etwa jeder vierte Tag hat gar keines.
 */
export const HAEUFIG = {
  ort: 1 / 5,
  zeit: 1 / 4,
  jahreszeit: 1 / 4,
  wetter: 1 / 7,
  ereignis: 1 / 28,
  geist: 1 / 7,
};

/**
 * Wie selten dieser Moment ist – kleiner heißt seltener.
 *
 * Das Produkt der Bedingungen. Gerechnet und nicht von Hand gesetzt: Eine
 * Zahl, die neben den Bedingungen steht, läuft ihnen mit der Zeit davon –
 * wer eine Bedingung dazuschreibt und die Zahl vergisst, hat einen Moment,
 * der sich für häufig hält und nie kommt.
 */
export function seltenheit(m) {
  let p = 1;
  const wenn = (m && m.wenn) || {};
  for (const schluessel in wenn) {
    if (HAEUFIG[schluessel] != null) p *= HAEUFIG[schluessel];
  }
  return p;
}

/**
 * Die Momente.
 *
 * `wenn` ist eine UND-Verknüpfung: Alle angegebenen Bedingungen müssen
 * zutreffen, die nicht angegebenen sind frei. Möglich sind `ort`, `zeit`,
 * `jahreszeit`, `wetter`, `ereignis` und `geist`.
 *
 * Der Ton ist derselbe wie überall hier: wortkarg, nichts erklärend, kein
 * Ausruf. Seli stellt fest, sie schwärmt nicht.
 */
/**
 * Ein Hinweis zum Ort `zuhause`, weil er leicht falsch gelesen wird: Er
 * prüft 380 Pixel um das Haus – also DAVOR, nicht darin. Vier Sätze hier
 * behaupteten zuerst, man stünde drinnen („Von drinnen ist Regen etwas
 * völlig anderes"), und das wäre eine kleine Lüge in jedem Durchgang
 * gewesen. Gefunden nicht beim Schreiben, sondern beim Nachsehen, was
 * `WUNSCH_ORTE.zuhause` wirklich testet.
 */
export const MOMENTE = [
  /* --- Häufig: eine oder zwei Bedingungen. Die ersten Wochen. --- */
  {
    id: 'erster_morgen_wasser', name: 'Morgens am Wasser',
    satz: 'Das Wasser ist noch ganz glatt.',
    wenn: { ort: 'wasser', zeit: 'morgen' },
  },
  {
    id: 'mittag_wald', name: 'Mittag im Wald',
    satz: 'Die Sonne steht hoch. Hier unten bleibt es kühl.',
    wenn: { ort: 'wald', zeit: 'tag' },
  },
  {
    id: 'abend_lager', name: 'Abend am Feuer',
    satz: 'Von hier aus sieht die Insel kleiner aus.',
    wenn: { ort: 'lager', zeit: 'abend' },
  },
  {
    id: 'nacht_zuhause', name: 'Nachts zuhause',
    satz: 'Das Fenster ist dunkel. Dahinter wartet das Bett.',
    wenn: { ort: 'zuhause', zeit: 'nacht' },
  },
  {
    id: 'regen_wald', name: 'Regen im Wald',
    satz: 'Es tropft von den Blättern, lange nachdem es aufgehört hat.',
    wenn: { ort: 'wald', wetter: 'regen' },
  },
  {
    id: 'nebel_wasser', name: 'Nebel über dem Wasser',
    satz: 'Das andere Ufer ist weg. Vielleicht war da nie eines.',
    wenn: { ort: 'wasser', wetter: 'nebel' },
  },
  {
    id: 'morgen_klippen', name: 'Morgens an den Klippen',
    satz: 'Der Wind kommt von vorn. Man muss sich festhalten.',
    wenn: { ort: 'klippen', zeit: 'morgen' },
  },
  {
    /**
     * Stand zuerst auf `ort: 'abseits'` – und war damit tot.
     *
     * „Weit weg von allem" hat in `ortAus` den letzten Rang, und jede
     * Kachel weit vom Feuer liegt zugleich am Wasser, im Wald oder an den
     * Klippen. Gemessen auf einer erzeugten Insel: EINE von 3531 Kacheln.
     * Der Moment war also geschrieben und unerreichbar, und keine Rechnung
     * hätte das gezeigt – in den Daten war alles in Ordnung.
     *
     * Die Stille Insel ist das, was `abseits` sein wollte: wirklich weit
     * draußen, und man hört das Feuer dort nicht.
     */
    id: 'insel_weit', name: 'Weit draußen',
    satz: 'Von hier hört man das Feuer nicht mehr.',
    wenn: { ort: 'insel' },
  },
  {
    id: 'nacht_wasser', name: 'Nachts am Wasser',
    satz: 'Das Wasser ist schwarz und bewegt sich trotzdem.',
    wenn: { ort: 'wasser', zeit: 'nacht' },
  },
  {
    id: 'schnee_lager', name: 'Schnee am Feuer',
    satz: 'Die Flocken verschwinden, kurz bevor sie ankommen.',
    wenn: { ort: 'lager', wetter: 'schnee' },
  },

  /* --- Mittel: drei Bedingungen. Nach ein paar Monaten. --- */
  {
    id: 'fruehling_morgen_wald', name: 'Erster Frühlingsmorgen',
    satz: 'Es riecht anders als letzte Woche.',
    wenn: { ort: 'wald', zeit: 'morgen', jahreszeit: 'spring' },
  },
  {
    id: 'sommer_nacht_klippen', name: 'Sommernacht an den Klippen',
    satz: 'Es ist warm, und unten geht die See.',
    wenn: { ort: 'klippen', zeit: 'nacht', jahreszeit: 'summer' },
  },
  {
    id: 'herbst_abend_wald', name: 'Herbstabend im Wald',
    satz: 'Das Laub liegt so dick, dass man sich nicht hört.',
    wenn: { ort: 'wald', zeit: 'abend', jahreszeit: 'autumn' },
  },
  {
    id: 'winter_morgen_wasser', name: 'Wintermorgen am Wasser',
    satz: 'Am Rand steht Eis. In der Mitte nicht.',
    wenn: { ort: 'wasser', zeit: 'morgen', jahreszeit: 'winter' },
  },
  {
    id: 'nebel_klippen_abend', name: 'Die graue Bucht',
    satz: 'Der Nebel steht in der Bucht wie Milch in einer Schale.',
    wenn: { ort: 'klippen', zeit: 'abend', wetter: 'nebel' },
  },
  {
    id: 'regen_zuhause_abend', name: 'Regen aufs Dach',
    satz: 'Das Dach hält dicht. Gut zu wissen.',
    wenn: { ort: 'zuhause', zeit: 'abend', wetter: 'regen' },
  },
  {
    id: 'schnee_wald_nacht', name: 'Schnee im Wald bei Nacht',
    satz: 'Es ist heller als sonst, obwohl es Nacht ist.',
    wenn: { ort: 'wald', zeit: 'nacht', wetter: 'schnee' },
  },
  {
    id: 'insel_nebel', name: 'Die Stille Insel im Nebel',
    satz: 'Sie heißt zu Recht so.',
    wenn: { ort: 'insel', wetter: 'nebel' },
  },
  {
    id: 'sommer_mittag_wasser', name: 'Hochsommer am Wasser',
    satz: 'Der Sand ist zu heiß, um stehen zu bleiben.',
    wenn: { ort: 'wasser', zeit: 'tag', jahreszeit: 'summer' },
  },
  {
    id: 'fruehling_abend_lager', name: 'Frühlingsabend am Feuer',
    satz: 'Es bleibt länger hell als neulich.',
    wenn: { ort: 'lager', zeit: 'abend', jahreszeit: 'spring' },
  },
  {
    id: 'herbst_regen_klippen', name: 'Herbststurm an den Klippen',
    satz: 'Der Regen kommt von der Seite. Vom Meer her.',
    wenn: { ort: 'klippen', wetter: 'regen', jahreszeit: 'autumn' },
  },
  {
    id: 'winter_nacht_zuhause', name: 'Winternacht vor der Tür',
    satz: 'Noch fünf Schritte, dann ist es warm.',
    wenn: { ort: 'zuhause', zeit: 'nacht', jahreszeit: 'winter' },
  },

  /* --- Selten: mit Tagesereignis. Das kann Jahre dauern. --- */
  {
    id: 'sterne_klippen', name: 'Sternennacht über den Klippen',
    satz: 'Von hier oben fallen sie direkt ins Meer.',
    wenn: { ort: 'klippen', zeit: 'nacht', ereignis: 'stars' },
  },
  {
    id: 'sterne_wasser', name: 'Sterne im Wasser',
    satz: 'Sie fallen zweimal. Einmal oben, einmal unten.',
    wenn: { ort: 'wasser', zeit: 'nacht', ereignis: 'stars' },
  },
  {
    id: 'sturm_zuhause', name: 'Sturmnacht vor der Tür',
    satz: 'Der Wind drückt gegen die Tür. Morgen liegt der Saum voll.',
    wenn: { ort: 'zuhause', zeit: 'nacht', ereignis: 'sturmnacht' },
  },
  {
    id: 'bluetenschnee_wald', name: 'Blütenschnee im Wald',
    satz: 'Es schneit, und es ist Frühling.',
    wenn: { ort: 'wald', ereignis: 'bluetenschnee' },
  },
  {
    // Ebenfalls von `abseits` umgezogen – siehe `insel_weit`.
    id: 'laubfall_insel', name: 'Laubfall, weit draußen',
    satz: 'Niemand wird das hier zusammenkehren.',
    wenn: { ort: 'insel', ereignis: 'laubfall' },
  },
  {
    id: 'falter_lager_abend', name: 'Falterzug am Feuer',
    satz: 'Sie kommen zum Licht. Alle.',
    wenn: { ort: 'lager', zeit: 'abend', ereignis: 'moths' },
  },
  {
    id: 'frost_klippen_morgen', name: 'Frostblüten an den Klippen',
    satz: 'Eisblumen, und zehn Schritte weiter geht die See.',
    wenn: { ort: 'klippen', zeit: 'morgen', ereignis: 'frostblueten' },
  },
  {
    id: 'mondblumen_insel_nacht', name: 'Mondblumen auf der Stillen Insel',
    satz: 'Sie stehen offen. Alle auf einmal.',
    wenn: { ort: 'insel', zeit: 'nacht', ereignis: 'mondblumen' },
  },
  {
    id: 'kauffahrer_wasser', name: 'Der Kauffahrer',
    satz: 'Da liegt wirklich ein Schiff. Es fährt nicht weiter.',
    wenn: { ort: 'wasser', ereignis: 'kauffahrer' },
  },
  {
    id: 'steinkraut_klippen', name: 'Steinkraut im Hochland',
    satz: 'Aus dem Fels heraus. Niemand hat das gesät.',
    wenn: { ort: 'klippen', ereignis: 'steinkraut' },
  },

  /* --- Im Watt. Nur bei Ebbe, also nur nach dem Kapitel. --- */
  {
    id: 'watt_weite', name: 'Trockenen Fußes',
    satz: 'Hier war gestern Meer. Heute stehe ich darauf.',
    wenn: { ort: 'wasser' }, braucht: 'gezeiten',
  },
  {
    id: 'watt_morgen', name: 'Morgens im Watt',
    satz: 'Die Rinnen laufen alle in dieselbe Richtung. Das Wasser weiß, wo es hinwill.',
    wenn: { ort: 'wasser', zeit: 'morgen' }, braucht: 'gezeiten',
  },

  /* --- Das zweite Jahr. Was die Insel beim ersten Mal zurückhält. --- */
  {
    id: 'wieder_fruehling', name: 'Wieder Frühling',
    satz: 'Letztes Jahr stand ich hier auch. Ich weiß es noch.',
    wenn: { jahreszeit: 'spring', zeit: 'morgen' }, braucht: 'wiederkehr',
  },
  {
    id: 'wieder_sommer', name: 'Der zweite Sommer',
    satz: 'Diesmal weiß ich schon, wo der Schatten ist.',
    wenn: { jahreszeit: 'summer', zeit: 'tag' }, braucht: 'wiederkehr',
  },
  {
    id: 'wieder_herbst', name: 'Der zweite Herbst',
    satz: 'Dieselben Bäume. Und sie sind größer geworden.',
    wenn: { jahreszeit: 'autumn', ort: 'wald' }, braucht: 'wiederkehr',
  },
  {
    id: 'wieder_winter', name: 'Der zweite Winter',
    satz: 'Ich habe nicht mehr gefroren. Das ist neu.',
    wenn: { jahreszeit: 'winter', zeit: 'abend' }, braucht: 'wiederkehr',
  },
  {
    id: 'meeresleuchten_nacht', name: 'Das Meer leuchtet',
    satz: 'Das Wasser leuchtet von innen. Niemand hat mir gesagt, dass es das tut.',
    wenn: { ort: 'wasser', zeit: 'nacht', ereignis: 'meeresleuchten' }, braucht: 'wiederkehr',
  },

  /* --- Bei einem Geist. Sie stehen nicht immer an derselben Stelle. --- */
  {
    id: 'geist_regen', name: 'Mit jemandem im Regen',
    satz: 'Es macht ihm nichts. Mir heute auch nicht.',
    wenn: { geist: null, wetter: 'regen' },
  },
  {
    id: 'geist_nacht_wasser', name: 'Nachts zu zweit am Wasser',
    satz: 'Wir sagen beide nichts. Das ist in Ordnung.',
    wenn: { geist: null, ort: 'wasser', zeit: 'nacht' },
  },
  {
    id: 'geist_schnee', name: 'Mit jemandem im Schnee',
    satz: 'Er hinterlässt keine Spuren. Ich schon.',
    wenn: { geist: null, wetter: 'schnee' },
  },
  {
    id: 'geist_sterne', name: 'Sterne, zu zweit',
    satz: 'Er sieht auch hoch. Also lohnt es sich.',
    wenn: { geist: null, zeit: 'nacht', ereignis: 'stars' },
  },
];

export const MOMENT_IDS = MOMENTE.map(function (m) { return m.id; });

/** Ein Moment nach Kennung – oder `null`. */
export function momentVon(id) {
  for (let i = 0; i < MOMENTE.length; i++) {
    if (MOMENTE[i].id === id) return MOMENTE[i];
  }
  return null;
}

/**
 * Die Lage, wie die Momente sie brauchen.
 *
 * Macht aus `ruheLage()` die fünf Begriffe, auf die `wenn` prüft. Der Ort
 * kommt über `ortAus`, damit am Lagerfeuer dasselbe gemeint ist wie bei den
 * Skizzen: EIN Platz, nach Rang von innen nach außen – wer am Feuer sitzt,
 * ist am Feuer und nicht am Wasser dahinter.
 */
export function lageAus(ruhe, ereignisId) {
  const l = ruhe || {};
  return {
    ort: ortAus(l.orte),
    zeit: zeitAus(l),
    jahreszeit: l.jahreszeit || null,
    wetter: l.wetter || null,
    ereignis: ereignisId || null,
    geist: l.geist || null,
  };
}

/**
 * Passt dieser Moment auf diese Lage?
 *
 * `geist: null` in den Bedingungen heißt „irgendein Geist in der Nähe" und
 * nicht „kein Geist". Das ist der einzige Sonderfall, und er steht hier,
 * weil die Alternative – für jeden der sieben Geister dieselben vier Momente
 * zu schreiben – aus vier Einträgen achtundzwanzig gemacht hätte, die sich
 * nur im Namen unterscheiden.
 */
export function passt(m, lage) {
  const wenn = (m && m.wenn) || {};
  const l = lage || {};
  for (const schluessel in wenn) {
    if (schluessel === 'geist') {
      if (!l.geist) return false;
      // Ein benannter Geist muss es sein, `null` heißt irgendeiner.
      if (wenn.geist != null && wenn.geist !== l.geist) return false;
      continue;
    }
    if (wenn[schluessel] !== l[schluessel]) return false;
  }
  return true;
}

/** Leerer Stand – wie `emptyWanderer` und `emptyKapitel`. */
export function emptyMomente() {
  return { gefunden: Object.create(null), zuletzt: 0 };
}

/** Ist dieser Moment schon gefunden? */
export function gefunden(stand, id) {
  return !!(stand && stand.gefunden && stand.gefunden[id]);
}

/** Wurde heute schon einer gefunden? */
export function heuteSchon(stand, tag) {
  return !!(stand && stand.zuletzt === tag);
}

/**
 * Welcher Moment hier und jetzt fällig ist – oder `null`.
 *
 * Der SELTENSTE passende gewinnt. Das ist die wichtigste Zeile der Datei:
 * Ohne sie würde „Nachts am Wasser" den Moment „Sterne im Wasser"
 * verdrängen, weil beide passen und der häufigere zuerst in der Liste steht.
 * Eine Sternennacht, die man einmal im Monat hat, wäre damit an einen Satz
 * verschenkt, den man jede Nacht bekommen kann.
 */
export function faelligerMoment(stand, lage, tag, hat) {
  if (heuteSchon(stand, tag)) return null;
  const vorhanden = typeof hat === 'function' ? hat : function () { return true; };
  let beste = null;
  let besteP = Infinity;
  for (let i = 0; i < MOMENTE.length; i++) {
    const m = MOMENTE[i];
    if (gefunden(stand, m.id)) continue;
    // Was ein Kapitel voraussetzt, gibt es vorher nicht.
    if (m.braucht && !vorhanden(m.braucht)) continue;
    if (!passt(m, lage)) continue;
    const p = seltenheit(m);
    if (p < besteP) { beste = m; besteP = p; }
  }
  return beste;
}

/** Einen Moment eintragen. Gibt den neuen Stand heraus. */
export function merke(stand, id, tag) {
  const s = stand && stand.gefunden ? stand : emptyMomente();
  s.gefunden[id] = tag;
  s.zuletzt = tag;
  return s;
}

/**
 * Was gefunden wurde, für die Chronik – die ältesten zuerst.
 *
 * Nur das Gefundene, nie das Fehlende. Eine Liste mit Lücken wäre eine
 * Aufgabenliste, und dann stünde jemand mit dem Wetterbericht am
 * Klippenrand – siehe Regel 4.
 */
export function gefundene(stand) {
  const raus = [];
  for (let i = 0; i < MOMENTE.length; i++) {
    const m = MOMENTE[i];
    const tag = stand && stand.gefunden ? stand.gefunden[m.id] : 0;
    if (tag) raus.push({ moment: m, tag: tag });
  }
  raus.sort(function (a, b) { return a.tag - b.tag; });
  return raus;
}

/** Wie viele gefunden sind und wie viele es gibt. */
export function momenteStand(stand) {
  let n = 0;
  for (let i = 0; i < MOMENTE.length; i++) {
    if (gefunden(stand, MOMENTE[i].id)) n++;
  }
  return { gefunden: n, gesamt: MOMENTE.length };
}
