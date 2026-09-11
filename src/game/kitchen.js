/**
 * Die Küche – wozu das Sammelgut sonst noch gut ist.
 *
 * Das Spiel hatte 86 Gegenstände, und alles Gesammelte ging genau zwei Wege:
 * verkaufen oder abgeben. Wer im Wald zehn Pilze fand, hatte zehn Pilze zum
 * Verkaufen. Der Garten, der Wald und die Wiese liefen alle in denselben
 * Trichter, und ein Korb Beeren war dasselbe wie vier Steine.
 *
 * Die Küche ist der dritte Weg. Sie nimmt, was wächst, und macht daraus
 * etwas, das **mehr wert ist als seine Teile**, das **jeder Geist gern
 * annimmt** und das **einen Tag lang etwas bewirkt**.
 *
 * **Drei Regeln, die hier nicht verhandelbar sind:**
 *
 * 1. **Kein Hunger.** Niemand muss essen. Es gibt keine Anzeige, die sinkt,
 *    keine Strafe fürs Auslassen, keine Erinnerung. Ein Spiel, in dem nichts
 *    verdirbt und nichts bestraft, bekommt keine Uhr ins Gesicht montiert,
 *    nur weil es eine Küche gibt.
 * 2. **Seli isst kein Tier.** Kein Fisch, kein Ei, kein Honig. Das ist keine
 *    Einschränkung, sondern die Figur – und nebenbei der Grund, warum die
 *    Küche das Sammelgut aufwertet und nicht das Angeln.
 * 3. **Eine Stärkung auf einmal.** Wer ein zweites Gericht isst, tauscht die
 *    erste gegen die zweite. Drei gleichzeitig wären ein Aufrüstbildschirm,
 *    und aus dem Frühstück würde Verwaltung.
 *
 * Die Stärkung hält bis zum Schlafengehen. Das ist der Takt, in dem dieses
 * Spiel ohnehin denkt: Der Tag ist die Einheit, nicht die Minute.
 */
import { getItem } from './items.js';

/**
 * Was eine Stärkung bewirkt.
 *
 * Drei, die man SPÜRT – daran sind sie ausgesucht. Ein Bonus auf etwas, das
 * man nicht bemerkt, ist eine Zahl im Spielstand und kein Frühstück.
 *
 *   flink      Man läuft sichtbar schneller. Fällt im ersten Schritt auf.
 *   kraeftig   Werkzeuge nehmen einen Schlag weniger. Eine Kiefer braucht
 *              vier statt fünf – man merkt es beim ersten Baum.
 *   glueck     Seltene Fische beißen öfter an. Das ist der einzige der drei,
 *              der Geduld belohnt statt sie zu ersetzen.
 */
export const STAERKUNG = {
  flink: {
    id: 'flink', name: 'Flink', icon: 'icon_boot',
    note: 'Du läufst heute schneller.',
    tempo: 1.22,
  },
  kraeftig: {
    id: 'kraeftig', name: 'Kräftig', icon: 'icon_axe',
    note: 'Werkzeuge nehmen einen Schlag weniger.',
    wucht: 1,
  },
  glueck: {
    id: 'glueck', name: 'Glücklich', icon: 'icon_sparkle',
    note: 'Seltene Fische beißen öfter an.',
    glueck: 1,
  },
};

export const STAERKUNG_IDS = Object.keys(STAERKUNG);

/**
 * Die Gerichte.
 *
 * `zutaten` ist die Liste, `wert` der Verkaufswert des Gerichts. Der liegt
 * bewusst deutlich über der Summe der Zutaten – etwa beim Doppelten. Das ist
 * der ganze wirtschaftliche Sinn: Kochen lohnt sich, ohne dass man dafür
 * etwas Neues finden müsste.
 *
 * Die Reihenfolge ist die im Fenster, und sie steigt: erst, was man am
 * ersten Tag hinbekommt, zuletzt das, wofür man auf eine Mondnacht oder
 * einen Regentag warten muss.
 */
export const GERICHTE = [
  {
    id: 'dish_berrymash', name: 'Beerenmus', staerkung: 'flink',
    zutaten: [{ id: 'berry', n: 3 }],
  },
  {
    id: 'dish_flowersalad', name: 'Blütensalat', staerkung: 'flink',
    zutaten: [{ id: 'flower_pink', n: 1 }, { id: 'flower_yellow', n: 1 }, { id: 'herb', n: 1 }],
  },
  {
    id: 'dish_herbtea', name: 'Kräutertee', staerkung: 'glueck',
    zutaten: [{ id: 'herb', n: 2 }, { id: 'flower_white', n: 1 }],
  },
  {
    id: 'dish_mushroompan', name: 'Pilzpfanne', staerkung: 'kraeftig',
    zutaten: [{ id: 'mushroom', n: 3 }, { id: 'herb', n: 1 }],
  },
  {
    id: 'dish_violetsyrup', name: 'Glockensirup', staerkung: 'glueck',
    zutaten: [{ id: 'flower_violet', n: 3 }],
  },
  {
    id: 'dish_forestsoup', name: 'Waldsuppe', staerkung: 'kraeftig',
    zutaten: [{ id: 'mushroom', n: 2 }, { id: 'herb', n: 2 }, { id: 'berry', n: 1 }],
  },
  {
    id: 'dish_berrycake', name: 'Beerenkuchen', staerkung: 'flink',
    zutaten: [{ id: 'berry', n: 4 }, { id: 'herb', n: 1 }],
  },
  // Die beiden letzten hängen an Wetter und Nacht. Sie sind der Grund, an
  // einem Regentag in den Wald und in einer Mondnacht auf die Wiese zu
  // gehen – dieselbe Rolle, die Mondlaterne und Nebelkristall schon spielen.
  {
    id: 'dish_rainstew', name: 'Regenpilz-Eintopf', staerkung: 'kraeftig',
    zutaten: [{ id: 'rainmushroom', n: 2 }, { id: 'mushroom', n: 2 }],
  },
  {
    id: 'dish_mooncake', name: 'Mondblütenkuchen', staerkung: 'glueck',
    zutaten: [{ id: 'moonflower', n: 2 }, { id: 'berry', n: 3 }],
  },
];

export const GERICHT_IDS = GERICHTE.map(function (g) { return g.id; });

export function istGericht(id) {
  return GERICHT_IDS.indexOf(id) >= 0;
}

export function gerichtFuer(id) {
  for (let i = 0; i < GERICHTE.length; i++) if (GERICHTE[i].id === id) return GERICHTE[i];
  return null;
}

/** Die Stärkung, die dieses Gericht gibt – oder null. */
export function staerkungVon(gerichtId) {
  const g = gerichtFuer(gerichtId);
  return g ? STAERKUNG[g.staerkung] || null : null;
}

/**
 * Was von den Zutaten fehlt. Leere Liste heißt: geht.
 *
 * Dieselbe Form wie `missingFor` an der Werkbank, damit das Fenster beide
 * gleich anzeigen kann.
 */
export function fehltFuer(gericht, inventory) {
  const raus = [];
  if (!gericht) return raus;
  for (let i = 0; i < gericht.zutaten.length; i++) {
    const z = gericht.zutaten[i];
    const da = inventory ? inventory.count(z.id) : 0;
    if (da < z.n) raus.push({ id: z.id, n: z.n - da });
  }
  return raus;
}

export function kannKochen(gericht, inventory) {
  return fehltFuer(gericht, inventory).length === 0;
}

/**
 * Was die Zutaten zusammen wert wären.
 *
 * Steht hier, damit ein Test nachrechnen kann, ob sich Kochen überhaupt
 * lohnt. Eine Küche, die aus 30 Münzen Zutaten ein Gericht für 28 macht,
 * wäre eine Falle für jeden, der sie benutzt.
 */
export function zutatenWert(gericht) {
  let summe = 0;
  if (!gericht) return 0;
  for (let i = 0; i < gericht.zutaten.length; i++) {
    const z = gericht.zutaten[i];
    const item = getItem(z.id);
    summe += (item ? item.value : 0) * z.n;
  }
  return summe;
}

/**
 * Was ein Geist sagt, wenn er etwas Gekochtes bekommt.
 *
 * Bis hierher bekam ein Gericht denselben Dank wie ein Stein: Brunos
 * „Brauchbar." für einen Beerenkuchen, den man aus vier Beeren und einem
 * Kraut zusammengesucht und am Feuer gerührt hat. Ein Gericht ist aber das
 * einzige Mitbringsel im Spiel, das nicht gefunden, sondern **gemacht**
 * wurde – und das gehört gesagt.
 *
 * Zwei Sätze je Geist, dieselben sieben Stimmen wie überall: Flämmchen
 * knapp, Bruno mürrisch, Wanda leise. Und dieselbe Regel wie beim Geplauder
 * und am Fest: kein Satz zweimal, keiner erteilt einen Auftrag.
 */
export const KOCH_DANK = {
  flamey: ['Warm. Von meinem Feuer?', 'Das hat am Topf gehangen. Riecht man.'],
  mira: ['Das war heute früh noch eine Blüte.', 'Selbst gemacht. Das schmeckt man.'],
  kiesel: ['Warmes Essen an Bord. Selten geworden.', 'Kein Fisch drin. Trotzdem gut.'],
  bruno: ['Hmpf. Warm.', 'Aus meinem Wald, nehme ich an.'],
  tobi: ['Selbst gemacht! Nach Rezept?', 'Das rieche ich bis in die Werkstatt.'],
  nelly: ['Jetzt sitze ich wenigstens nicht allein am Tisch.', 'Die Hälfte hebe ich auf. Für morgen.'],
  wanda: ['Das hast du den ganzen Weg herübergebracht.', 'Es ist noch warm. Wie machst du das?'],
};

/** Die Sätze eines Geistes zu Gekochtem – oder leer. */
export function kochDank(spiritId) {
  return KOCH_DANK[spiritId] || [];
}

/** Leerer Küchenstand – wie `emptyLoan` beim Kredit. */
export function emptyKitchen() {
  return null;
}

/**
 * Die Stärkung von heute, oder null.
 *
 * Sie steht mit dem Tag im Spielstand, an dem gegessen wurde. Damit läuft
 * sie beim Schlafen von selbst ab, ohne dass irgendwo ein Zähler tickt –
 * und ein alter Spielstand, in dem etwas anderes steht, hat einfach keine.
 */
export function staerkungHeute(stand, tag) {
  if (!stand || stand.tag !== tag) return null;
  return STAERKUNG[stand.id] || null;
}

/** Wie viel schneller man heute läuft (1 = normal). */
export function tempoFaktor(stand, tag) {
  const s = staerkungHeute(stand, tag);
  return s && s.tempo ? s.tempo : 1;
}

/** Wie viele Schläge ein Werkzeug heute zusätzlich schafft. */
export function wuchtBonus(stand, tag) {
  const s = staerkungHeute(stand, tag);
  return s && s.wucht ? s.wucht : 0;
}

/** Ob seltene Fische heute öfter anbeißen. */
export function glueckBonus(stand, tag) {
  const s = staerkungHeute(stand, tag);
  return s && s.glueck ? s.glueck : 0;
}
