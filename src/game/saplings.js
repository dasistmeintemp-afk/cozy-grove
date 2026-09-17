/**
 * Setzlinge – Bäume, die du selbst hinstellst.
 *
 * Die Insel gab Bäume her, und man konnte sie fällen. Was man nicht konnte:
 * **einen setzen.** Damit war jeder Baum auf dieser Insel einer, den der
 * Weltgenerator dort hingelegt hat – und die Landschaft war etwas, das man
 * abräumt, nie etwas, das man anlegt.
 *
 * Das steht quer zur Spielidee. Die Insel liegt als blasse Zeichnung da und
 * bekommt durch dich ihre Farbe zurück; ein Baum, den du auf eine kahle
 * Stelle gesetzt hast und der über eine Woche hochkommt, ist das Stärkste,
 * was dieser Satz hergibt.
 *
 * **Ein Setzling wird ein GEWÖHNLICHER Baum.** Das ist die ganze Bauart und
 * die einzige Entscheidung, die hier wirklich zählt: Am Ende steht kein
 * „gepflanzter Baum" mit eigenen Regeln, sondern ein `tree_oak` wie jeder
 * andere. Damit gilt alles, was es für Bäume ohnehin schon gibt – fällen,
 * Holz, Nachwuchs, das Rauschen im Klangbett, die Falter, der Waldtest bei
 * den Wunschplätzen – ohne dass eine einzige Zeile davon etwas von
 * Setzlingen wissen muss.
 *
 * **Er wächst nach Jahreszeit.** Dieselben Faktoren wie beim Nachwuchs
 * (`SEASON_REGROW`): im Frühling schneller, im Winter langsamer. Wer im
 * Januar pflanzt, wartet länger – und das ist kein Nachteil, sondern der
 * Grund, warum ein Jahr auf dieser Insel ein Jahr ist.
 */
import { regrowDays } from './seasons.js';

/**
 * Was aus welchem Setzling wird.
 *
 * Vier Sorten, dieselben vier, die auf der Insel stehen. Ein einziger
 * „Baumsetzling", aus dem irgendetwas wird, wäre einfacher gewesen und
 * hätte genau das kaputtgemacht, worum es geht: Wer eine Birkenreihe
 * pflanzen will, soll eine Birkenreihe bekommen.
 *
 *   wird   die Objektart, die daraus entsteht
 *   tage   Tage bis dahin, vor der Jahreszeit
 *   laub   die Farbe des Schösslings – je Sorte eine andere
 */
export const SETZLINGE = {
  sapling_oak: { id: 'sapling_oak', name: 'Eichensetzling', wird: 'tree_oak', tage: 6, laub: '#8fb26a' },
  sapling_birch: { id: 'sapling_birch', name: 'Birkensetzling', wird: 'tree_birch', tage: 5, laub: '#a8c47f' },
  sapling_maple: { id: 'sapling_maple', name: 'Ahornsetzling', wird: 'tree_maple', tage: 6, laub: '#c08a4e' },
  sapling_pine: { id: 'sapling_pine', name: 'Kiefernsetzling', wird: 'tree_pine', tage: 8, laub: '#6f9470' },
};

export const SETZLING_IDS = Object.keys(SETZLINGE);

/**
 * Wie viele Wachstumsstufen ein Setzling durchläuft, bevor er ein Baum ist.
 *
 * Zwei, und das ist mit Absicht wenig: Ein Setzling ist kein Beet. Was
 * zählt, ist der Tag, an dem statt des Stecklings ein Baum dasteht – die
 * Zwischenstufe gibt es nur, damit man vorher SIEHT, dass sich etwas tut.
 */
export const STUFEN = 2;

/** Der Setzling zu einer Kennung – oder null. */
export function setzlingFuer(id) {
  return SETZLINGE[id] || null;
}

/** Welcher Setzling aus diesem Baum fällt – oder null. */
export function setzlingVonBaum(kind) {
  for (let i = 0; i < SETZLING_IDS.length; i++) {
    const s = SETZLINGE[SETZLING_IDS[i]];
    if (s.wird === kind) return s.id;
  }
  return null;
}

/**
 * Wie lange dieser Setzling in dieser Jahreszeit braucht.
 *
 * Über `regrowDays` und nicht über eine eigene Rechnung: Der Winter bremst
 * den Nachwuchs schon, und zwei Formeln für dieselbe Sache liefen beim
 * ersten Zahlendreher auseinander.
 */
export function tageFuer(setzling, season) {
  if (!setzling) return 1;
  return regrowDays(setzling.tage, season);
}

/**
 * Welche Stufe ein Setzling mit diesem Wachstum zeigt.
 *
 * @returns {number} 0 … STUFEN-1, oder STUFEN wenn er fertig ist
 */
export function stufeVon(gewachsen, tage) {
  const t = Math.max(1, tage | 0);
  if (gewachsen >= t) return STUFEN;
  return Math.min(STUFEN - 1, Math.floor((gewachsen / t) * STUFEN));
}

/** Der Grafikname zu Sorte und Stufe. */
export function spriteVon(setzlingId, stufe) {
  return 'sapling_' + setzlingId.replace('sapling_', '') + '_' +
    Math.max(0, Math.min(STUFEN - 1, stufe | 0));
}

/** Wie viele Tage es noch dauert. */
export function tageBis(gewachsen, tage) {
  return Math.max(0, Math.max(1, tage | 0) - (gewachsen | 0));
}

/**
 * Wie oft ein gefällter Baum einen Setzling hergibt.
 *
 * Ein Drittel. Gemessen nicht nötig, aber überlegt: Bei jedem Baum hätte man
 * nach einer Woche dreißig Setzlinge und pflanzte nie – der Wert läge bei
 * null. Bei jedem zehnten wäre es ein Glücksfall statt einer Möglichkeit.
 * Ein Drittel heißt: Wer drei Bäume fällt, kann einen ersetzen, und wer
 * einen Hain will, muss dafür Holz machen.
 */
export const AUS_BAUM = 1 / 3;
