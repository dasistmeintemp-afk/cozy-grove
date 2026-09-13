/**
 * Anbau.
 *
 * Die eine Sache im Spiel, die MORGEN von dir abhängt: Alles andere gibt die
 * Insel her – Bäume wachsen nach, Grabstellen verteilen sich neu, Geister
 * denken sich Bitten aus. Ein Beet steht nur da, weil du es gestern gesetzt
 * hast, und es ist genau dann fertig, wenn du wiederkommst.
 *
 * Bewusst ohne Strafe: Nichts verdorrt, nichts muss gegossen werden. Wer eine
 * Woche nicht vorbeikommt, findet seine Ernte vor. Regen beschleunigt, aber
 * seine Abwesenheit bremst nicht – das Wetter ist ein Geschenk, keine Pflicht.
 */
import { randInt, randPick } from '../core/rng.js';

/**
 * Was aus welcher Saat wird.
 *
 * `days` sind Tage bis zur Reife, `stageDays` die Schwellen für die drei
 * Wachstumsstufen. Die Erträge sind absichtlich höher als eine einzelne
 * Fundstelle in der Wildnis: Wer plant, soll mehr haben als wer sucht – sonst
 * gäbe es keinen Grund, überhaupt zu säen.
 */
export const CROPS = {
  berry: {
    id: 'berry',
    seed: 'seed_berry',
    name: 'Beerensaat',
    yields: ['berry'],
    amount: [2, 4],
    days: 2,
    leaf: '#7cb567',
    fruit: '#c4536b',
    form: 'beere',
  },
  herb: {
    id: 'herb',
    seed: 'seed_herb',
    name: 'Krautsaat',
    yields: ['herb'],
    amount: [2, 4],
    days: 2,
    leaf: '#8fbf6a',
    fruit: '#6f9c47',
    form: 'blatt',
  },
  flower: {
    id: 'flower',
    seed: 'seed_flower',
    name: 'Blumensaat',
    // Welche Blume kommt, entscheidet sich erst bei der Ernte – eine kleine
    // Überraschung, und die Sternblume ist die seltene darunter.
    yields: ['flower_pink', 'flower_yellow', 'flower_violet', 'flower_white'],
    // Stehen mehrere Blumenbeete beieinander, kann eine Dämmerblume dazwischen
    // aufgehen – siehe `kreuzChance`. Nur diese eine Saat kann das.
    kreuzung: 'flower_dusk',
    amount: [2, 3],
    days: 3,
    leaf: '#86ad4b',
    fruit: '#dd7fa2',
    form: 'blüte',
  },
  moon: {
    id: 'moon',
    seed: 'seed_moon',
    name: 'Mondsaat',
    // Mondblumen wachsen wild nur nachts. Im Beet blühen sie auch tagsüber –
    // dafür dauert es am längsten und die Saat ist teuer.
    yields: ['moonflower'],
    amount: [1, 2],
    days: 4,
    leaf: '#7fa9a4',
    fruit: '#cfd9f2',
    form: 'mond',
  },
};

export const CROP_IDS = Object.keys(CROPS);

/** Die Saat zu einer Pflanze und umgekehrt. */
export function cropOfSeed(seedId) {
  for (let i = 0; i < CROP_IDS.length; i++) {
    const c = CROPS[CROP_IDS[i]];
    if (c.seed === seedId) return c;
  }
  return null;
}

/**
 * Welche Wachstumsstufe (0..2) eine Pflanze nach `fortschritt` Tagen hat.
 *
 * Die Reife wird beim letzten Schritt erreicht; davor liegen zwei sichtbar
 * verschiedene Zustände. Bei einer Saat, die nur zwei Tage braucht, heißt das
 * Keimling – junge Pflanze – reif, also jeden Morgen etwas Neues zu sehen.
 */
export function stageOf(fortschritt, days) {
  if (fortschritt >= days) return 2;
  if (fortschritt >= days / 2) return 1;
  return 0;
}

/** Verbleibende Tage bis zur Ernte – 0 heißt: heute. */
export function daysToRipe(crop, fortschritt) {
  return Math.max(0, crop.days - fortschritt);
}

/**
 * Wie viel eine Pflanze an einem Tag wächst.
 *
 * Regen zählt doppelt. Damit hat das Wetter zum ersten Mal Folgen, die über
 * das Aussehen hinausgehen – ein Regentag ist ein guter Tag, und man merkt
 * es am nächsten Morgen im Beet.
 */
export function growthPerDay(weatherKind) {
  return weatherKind === 'rain' ? 2 : 1;
}

/** Ernte einer reifen Pflanze. */
export function harvestOf(crop, rng) {
  const n = randInt(rng, crop.amount[0], crop.amount[1]);
  const id = crop.yields.length === 1 ? crop.yields[0] : randPick(rng, crop.yields);
  const out = [{ id: id, n: n }];
  // Ein Teil der Ernte trägt sich selbst weiter. Ohne das wäre der Garten ein
  // Fass ohne Boden, mit dem man dauernd zum Händler zurückmüsste.
  if (rng() < 0.45) out.push({ id: crop.seed, n: 1 });
  return out;
}

export const SEED_IDS = CROP_IDS.map(function (id) { return CROPS[id].seed; });

/* ------------------------------------------------------------------ Zucht */

/**
 * Blumen, die beieinanderstehen.
 *
 * Der Garten konnte bisher nur EINES: säen, warten, ernten. Wo die Beete
 * lagen, war gleichgültig – vier einzelne Blumenbeete über die Insel verteilt
 * brachten genau dasselbe wie vier nebeneinander. Damit war das Anlegen eines
 * Gartens eine Frage des Geschmacks und sonst nichts.
 *
 * Jetzt lohnt sich das **Beieinander**: Wer Blumenbeete nebeneinander legt,
 * kann bei der Ernte eine **Dämmerblume** bekommen – die eine Blume im Spiel,
 * die nirgends wild wächst. Man findet sie nicht; man zieht sie.
 *
 * Drei Dinge sind daran Absicht:
 *
 * 1. **Es ist eine Chance, keine Bedingung.** Wer daneben liegt, verliert
 *    nichts – die normale Ernte kommt so oder so. Ein Garten, der nur mit
 *    dem richtigen Muster etwas hergibt, wäre ein Rätsel, und Rätsel gehören
 *    hier nicht in den Garten.
 * 2. **Gießen hilft.** Die Kanne hatte bisher genau einen Zweck (ein Tag
 *    schneller). Jetzt hat sie einen zweiten, und der ist der interessantere.
 * 3. **Es hört auf zu steigen.** Ab vier Nachbarn bringt das fünfte nichts
 *    mehr. Sonst wäre die beste Antwort ein Feld aus vierzig Beeten, und aus
 *    dem Garten würde eine Fabrik.
 */

/** Wie nah ein Nachbarbeet liegen muss – gut zwei Kacheln. */
export const KREUZ_RADIUS = 150;

/** Wie viel jedes Nachbarbeet zur Chance beiträgt. */
export const KREUZ_JE_NACHBAR = 0.09;

/** Was Gießen dazulegt – aber nur, wenn überhaupt ein Nachbar da ist. */
export const KREUZ_GEGOSSEN = 0.08;

/** Obergrenze. Ab hier bringt das nächste Beet nichts mehr. */
export const KREUZ_MAX = 0.38;

/** Ab wie vielen Nachbarn die Obergrenze erreicht ist – nur zur Anzeige. */
export const KREUZ_GENUG = 4;

/**
 * Wie wahrscheinlich die Dämmerblume ist.
 *
 * @param {number} nachbarn  andere Blumenbeete in Reichweite
 * @param {boolean} gegossen ob dieses Beet heute gegossen wurde
 * @returns {number} 0 bis KREUZ_MAX
 */
export function kreuzChance(nachbarn, gegossen) {
  const n = nachbarn > 0 ? nachbarn : 0;
  if (n === 0) return 0;   // allein geht gar nichts – auch gegossen nicht
  const roh = n * KREUZ_JE_NACHBAR + (gegossen ? KREUZ_GEGOSSEN : 0);
  return Math.min(KREUZ_MAX, roh);
}

/** Was dieses Beet durch Nachbarschaft hervorbringen kann – oder null. */
export function kreuzungVon(crop) {
  return (crop && crop.kreuzung) || null;
}
