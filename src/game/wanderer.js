/**
 * Der Wanderer – jemand, der nicht hierher gehört.
 *
 * Die Insel hat sieben Geister, und die sind immer da. Das ist ihre Stärke
 * und zugleich das, was auf Dauer fehlt: **Es kommt nie jemand vorbei.** Ein
 * Ort, an dem sich nie etwas von außen zeigt, ist kein Ort, sondern eine
 * Kulisse.
 *
 * Der Wanderer ist die Gegenprobe dazu. Er kommt an manchen Morgen, steht
 * einen Tag lang am Strand, und am nächsten ist er weg.
 *
 * **Vier Regeln, die ihn von einem Geist unterscheiden:**
 *
 * 1. **Er bleibt nicht.** Kein Farbkreis, keine Freundschaftsstufe, keine
 *    Erinnerungskette. Er ist ein Tag, kein Bogen.
 * 2. **Er stellt keine Aufgabe.** Er hat etwas dabei und sucht etwas – das
 *    ist ein Tausch, keine Bitte. Wer nichts hat, was er sucht, redet
 *    trotzdem mit ihm.
 * 3. **Er gibt, was es sonst nicht gibt.** Seine Reiselaterne kommt aus
 *    keiner Werkbank und aus keinem Katalog. Sonst wäre er ein Händler mit
 *    Hut.
 * 4. **Ihn zu verpassen kostet nichts.** Er kommt wieder – wie der Geburtstag
 *    und das Fest. Ein Besucher, den man verpassen KANN, wäre ein Termin mit
 *    Strafe, und davon gibt es hier keine.
 *
 * Alles hier hängt am Inselsamen und am Tag, nicht am Zufall des Augenblicks:
 * Wer neu lädt, findet denselben Wanderer mit demselben Wunsch vor.
 */
import { dailyRng, randPick } from '../core/rng.js';

/**
 * Die Länge eines Fensters: Genau einmal je sieben Tage kommt er.
 *
 * Der erste Versuch war ein Tageswurf – jeden Morgen 17 % Chance. Im Schnitt
 * kam dabei dasselbe heraus (alle sieben Tage), aber die Messung über 400
 * Inseln und ein Jahr zeigte den Preis: **bis zu 66 Tage am Stück ohne ihn**,
 * und auf mancher Insel steht er das erste Mal erst an Tag 46 am Strand. Das
 * sind fünfzehn Stunden Spiel für einen Besucher, den man dann nicht mehr
 * erwartet.
 *
 * Deshalb der Fensterwurf: Nicht „kommt er heute?", sondern „an welchem Tag
 * dieser Woche kommt er?". Gleicher Schnitt, aber der Abstand liegt jetzt
 * zwischen 2 und 12 Tagen statt zwischen 1 und 66, und der erste Besuch
 * spätestens an Tag 11.
 *
 * Der Tag im Fenster wird aus 1…6 gewählt, nie 0. Das ist der Grund, warum er
 * nie zwei Tage hintereinander dasteht: Zwischen dem letzten Tag eines
 * Fensters und dem ersten des nächsten liegt so immer mindestens ein Tag.
 * Eine Regel, die aus der Bauart folgt, kann man nicht vergessen.
 */
export const FENSTER = 7;

/**
 * Ab welchem Tag er überhaupt kommt.
 *
 * Die ersten Tage gehören der Insel selbst. Wer am zweiten Tag noch nicht
 * weiß, wo die Werkbank steht, braucht keinen Fremden am Strand.
 */
export const FRUEHESTENS = 5;

/** Kleinster und größter Abstand zwischen zwei Besuchen – beides geprüft. */
export const ABSTAND_MIN = 2;
export const ABSTAND_MAX = 2 * FENSTER - 2;

/** Kommt er heute? */
export function wandererAm(seed, tag) {
  if (!(tag >= FRUEHESTENS)) return false;
  const fenster = Math.floor((tag - FRUEHESTENS) / FENSTER);
  return tag === FRUEHESTENS + fenster * FENSTER + tagImFenster(seed, fenster);
}

/** Der eine Tag: 1…6, nie der Fensteranfang. */
function tagImFenster(seed, fenster) {
  return 1 + Math.floor(dailyRng(seed, fenster, 'wanderer-fenster')() * (FENSTER - 1));
}

/** Der nächste Tag, an dem er kommt – für „bald ist wieder jemand da". */
export function naechsterBesuch(seed, tag) {
  for (let t = Math.max(tag, FRUEHESTENS); t < tag + 2 * FENSTER + 2; t++) {
    if (wandererAm(seed, t)) return t;
  }
  return 0;
}

/**
 * Was er sucht.
 *
 * Lauter Dinge, die man auf der Insel findet, ohne sie zu suchen – er will
 * nichts, wofür man einen halben Tag braucht. Der Tausch soll sich anfühlen
 * wie „ach, das habe ich dabei", nicht wie ein Auftrag.
 */
export const SUCHT = [
  { id: 'shell', n: 3 },
  { id: 'driftwood', n: 3 },
  { id: 'herb', n: 4 },
  { id: 'berry', n: 4 },
  { id: 'mushroom', n: 4 },
  { id: 'resin', n: 3 },
  { id: 'bottle', n: 1 },
  { id: 'shard', n: 2 },
  { id: 'feather', n: 3 },
  { id: 'flower_white', n: 2 },
];

/**
 * Was er dafür gibt – neben der Reiselaterne.
 *
 * Sachen, die auf der Insel selten sind, aber nicht unerreichbar: Er ist
 * kein Abkürzung, er ist ein guter Tag.
 */
export const GIBT = [
  { items: [{ id: 'gem', n: 1 }], coins: 120 },
  { items: [{ id: 'amber', n: 1 }], coins: 90 },
  { items: [{ id: 'stardust', n: 2 }], coins: 110 },
  { items: [{ id: 'copper_ore', n: 6 }, { id: 'hardwood', n: 4 }], coins: 140 },
  { items: [{ id: 'seed_moon', n: 2 }], coins: 130 },
];

/** Das eine Stück, das es nur bei ihm gibt. */
export const MITBRINGSEL = 'travellamp';

/**
 * Beim wievielten Tausch er die Reiselaterne herausrückt.
 *
 * Nicht beim ersten: Was man beim ersten Handschlag bekommt, ist ein
 * Begrüßungsgeschenk und kein Andenken. Beim zweiten hat man ihn schon
 * einmal gehen sehen und weiß, dass er wiederkommt.
 */
export const LATERNE_AB = 2;

/**
 * Was er sagt.
 *
 * Wortkarg wie alle hier. Drei Sorten: beim Ankommen, wenn man nichts dabei
 * hat, und nach dem Tausch.
 */
export const SAETZE = {
  gruss: [
    'Ich bin nur auf der Durchreise.',
    'Schöne Insel. Ich war schon auf schlechteren.',
    'Ich laufe von Ort zu Ort. Der hier ist neu.',
    'Morgen bin ich weg. Heute nicht.',
  ],
  wunsch: [
    'Hättest du davon etwas übrig?',
    'Ich suche so etwas. Tauschen?',
    'Danach halte ich gerade Ausschau.',
  ],
  nichts: [
    'Ein andermal. Ich komme wieder vorbei.',
    'Kein Problem. Ich habe Zeit – nur nicht hier.',
    'Dann eben nicht. Schön war es trotzdem.',
  ],
  dank: [
    'Das nehme ich mit. Hier, dafür.',
    'Guter Tausch. Für uns beide.',
    'Danke. Das trage ich eine Weile herum.',
  ],
  laterne: [
    'Die hat mich weit getragen. Jetzt du.',
    'Nimm die hier. Ich finde eine neue.',
  ],
  // Beim vierten Tausch. Er gibt Kleider her, nicht Ausrüstung – deshalb
  // sagt er auch nichts darüber, wozu sie taugen.
  tracht: [
    'Die hier hält Wind aus. Probier sie.',
    'Zu eng für mich geworden. Dir passt sie.',
  ],
  // Nach dem Tausch. Nicht „komm morgen wieder" – morgen ist er weg, und ein
  // Satz, der auf einen Termin zeigt, den es nicht gibt, ist eine Lüge.
  satt: [
    'Für heute habe ich genug im Sack.',
    'Mehr trage ich nicht. Setz dich ruhig dazu.',
    'Alles getauscht. Schöner Tag hier.',
  ],
  // Wenn die Tasche voll ist. Er nimmt nichts an, was man nicht bezahlt
  // bekommt – sonst gäbe man drei Muscheln für nichts.
  voll: [
    'Deine Tasche platzt. Leg erst etwas ab.',
    'Da passt nichts mehr hinein. Ich warte.',
  ],
};

/**
 * Sein Besuch an einem bestimmten Tag.
 *
 * Alles aus demselben Tageswurf: Wer neu lädt, findet denselben Wunsch vor.
 *
 * @returns {object|null}
 */
export function besuchFuer(seed, tag) {
  if (!wandererAm(seed, tag)) return null;
  const rnd = dailyRng(seed, tag, 'wanderer-handel');
  return {
    tag: tag,
    sucht: randPick(rnd, SUCHT),
    gibt: randPick(rnd, GIBT),
    gruss: randPick(rnd, SAETZE.gruss),
    wunsch: randPick(rnd, SAETZE.wunsch),
    nichts: randPick(rnd, SAETZE.nichts),
    dank: randPick(rnd, SAETZE.dank),
    satt: randPick(rnd, SAETZE.satt),
    voll: randPick(rnd, SAETZE.voll),
    laterne: randPick(rnd, SAETZE.laterne),
    tracht: randPick(rnd, SAETZE.tracht),
  };
}

/** Leerer Stand – wie `emptyPet` und `emptyFeste`. */
export function emptyWanderer() {
  return { tag: 0, getauscht: 0, gegruesst: 0 };
}

/** Hat er heute schon gegrüßt? */
export function heuteGegruesst(stand, tag) {
  return !!(stand && stand.gegruesst === tag);
}

/**
 * Hat er heute schon getauscht?
 *
 * Einmal am Tag, wie das Mitbringsel beim Geist: Sonst stünde man mit
 * dreißig Muscheln vor ihm und ginge mit drei Meerkristallen wieder weg.
 */
export function heuteGetauscht(stand, tag) {
  return !!(stand && stand.tag === tag);
}

/** Wie oft insgesamt schon mit ihm getauscht wurde. */
export function tauschZahl(stand) {
  return (stand && stand.getauscht) || 0;
}

/** Gibt es diesmal die Reiselaterne dazu? */
export function gibtLaterne(stand) {
  return tauschZahl(stand) + 1 === LATERNE_AB;
}

/**
 * Was er außer Münzen und Fundstücken diesmal herausrückt.
 *
 * Bis hierher gab es genau EIN Andenken, die Laterne beim zweiten Tausch –
 * und danach war er für immer ein Händler mit wechselndem Sortiment. Wer ihm
 * zwanzigmal Muscheln brachte, bekam zwanzigmal dasselbe: Münzen und einen
 * Edelstein.
 *
 * Jetzt sind es zwei Stationen, und die zweite ist absichtlich etwas ganz
 * anderes als die erste: **seine Tracht**. Ein zweites Möbelstück wäre mehr
 * vom Gleichen gewesen; die Kleider sind das einzige, was er hat und man
 * nicht kaufen kann.
 *
 * Warum nicht mehr als zwei: Jede weitere Station müsste entweder etwas
 * Neues sein, das nur hier vorkommt – dann wächst das Spiel an seinem Rand
 * statt in der Mitte –, oder eine Wiederholung, und dann ist die Station
 * keine. Nach dem vierten Tausch ist er wieder das, was er sein soll: ein
 * guter Tag, kein Fortschrittsbalken.
 *
 * @returns {?object} {art:'ding'|'tracht', id} – oder null
 */
export function andenkenFuer(stand) {
  const naechster = tauschZahl(stand) + 1;
  for (let i = 0; i < ANDENKEN.length; i++) {
    if (ANDENKEN[i].ab === naechster) return ANDENKEN[i];
  }
  return null;
}

/** Die Stationen. `ab` ist der wievielte Tausch. */
export const ANDENKEN = [
  { ab: LATERNE_AB, art: 'ding', id: MITBRINGSEL },
  { ab: 4, art: 'tracht', id: 'wanderer' },
];
