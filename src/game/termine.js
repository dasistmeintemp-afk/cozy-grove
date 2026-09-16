/**
 * Was kommt – die elf Termine des Jahres.
 *
 * Die Insel hat sieben Geburtstage und vier Feste, zusammen **elf Tage im
 * Jahr**, an denen etwas ist. Und sie hat davon bis hierher **an genau dem
 * Morgen erzählt, an dem es so weit war** – `birthdayOn(new Date())` im
 * Aufgabenfenster, sonst nichts.
 *
 * Damit lieferte das Spiel nur die Hälfte von dem, was in `festivals.js`
 * über ein Fest steht:
 *
 *   > Ein **Termin**. Etwas, von dem man WEISS, dass es kommt, und auf das
 *   > man sich freuen kann.
 *
 * Das Wissen fehlte. Wer Mira etwas zum Geburtstag schenken wollte, hätte an
 * genau dem richtigen Morgen zufällig das Aufgabenfenster öffnen müssen – und
 * hätte dann keinen Tag mehr gehabt, ihre Sternblume zu suchen.
 *
 * **Vorfreude, keine Pflicht.** Nichts hier verlangt etwas. Wer nicht
 * hinsieht, verliert nichts: Der Geburtstag kommt nächstes Jahr wieder, und
 * das Fest auch. Dieselbe Regel wie überall sonst auf dieser Insel.
 *
 * Es gibt dafür schon einen Vorläufer im Spiel: Der **Wetterhahn** sagt an,
 * was morgen wird. Genau so klein ist das hier gehalten – eine Zeile, kein
 * eigenes Fenster.
 */
import { SPIRITS, SPIRIT_IDS } from './spirits.js';
import { FESTE } from './festivals.js';

/**
 * Wie viele Tage vorher Bescheid gesagt wird.
 *
 * Sieben, und die Zahl ist gemessen statt gewählt. Zwei Überlegungen:
 *
 * 1. **Wer einmal die Woche spielt, soll jeden Termin kommen sehen.** Die
 *    Geburtstage hängen am ECHTEN Kalender, nicht an der Inselzeit – wer
 *    sonntags spielt, hat sonst schlicht Pech. Ein Fenster von sieben Tagen
 *    ist das kleinste, bei dem niemand durchfallen kann: Wer mindestens alle
 *    sieben Tage hereinschaut, landet zwangsläufig darin.
 * 2. **Und es soll trotzdem eine Nachricht bleiben.** Über das Jahr gemessen
 *    zeigt die Zeile damit an **21 % der Tage** etwas – an vier von fünf
 *    Tagen steht dort nichts. Bei vierzehn Tagen Vorlauf wären es 39 %, und
 *    was an zwei von fünf Tagen dasteht, liest niemand mehr.
 *
 * Dazu passt, was man in der Zeit tun soll: Nellys Meerkristall und Wandas
 * Mondblume findet man nicht nebenbei. Zwei Tage reichten dafür nicht.
 */
export const VORLAUF = 7;

/**
 * Alle Termine des Jahres, nach Datum sortiert.
 *
 * Aus den vorhandenen Listen gerechnet und nirgends zweitgeschrieben: Wer
 * einen Geburtstag verschiebt oder ein Fest dazunimmt, ändert `spirits.js`
 * bzw. `festivals.js` – und diese Liste folgt. Eine zweite Tabelle daneben
 * wäre die Sorte Wahrheit, die irgendwann von der ersten abweicht.
 */
export function alleTermine() {
  const raus = [];
  for (let i = 0; i < SPIRIT_IDS.length; i++) {
    const s = SPIRITS[SPIRIT_IDS[i]];
    if (!s.geburtstag) continue;
    raus.push({
      art: 'geburtstag',
      id: s.id,
      monat: s.geburtstag.monat,
      tag: s.geburtstag.tag,
      name: s.name + ' hat Geburtstag',
      icon: 'icon_heart',
      // Woran man denken kann, wenn man mag. Kein Auftrag – nur der Hinweis,
      // dass ein Geschenk an dem Tag dreifach zählt.
      mag: s.favourite || null,
    });
  }
  for (const key in FESTE) {
    const f = FESTE[key];
    raus.push({
      art: 'fest',
      id: f.id,
      monat: f.datum.monat,
      tag: f.datum.tag,
      name: f.name,
      icon: f.icon,
      mag: null,
    });
  }
  raus.sort(function (a, b) { return a.monat - b.monat || a.tag - b.tag; });
  return raus;
}

/**
 * Ein erzwungenes Datum – zum Nachsehen, nicht zum Spielen.
 *
 * Genau wie `forceSeason` in `calendar.js`, und aus demselben Grund: Die
 * Termine hängen am echten Kalender. Wer im September nachsehen will, ob die
 * Zeile zu Nellys Geburtstag richtig dasteht, müsste sonst bis Januar warten
 * oder die Uhr des Rechners stellen.
 *
 * Die Umschaltung sitzt HIER und nicht bei jedem Aufrufer: An `heuteIst`
 * hängen die Vorschau, die Ansage am Morgen und die Zeile im Fenster
 * gleichzeitig – drei Schalter wären drei Wahrheiten.
 */
let erzwungen = null;

export function forceHeute(date) {
  erzwungen = date instanceof Date && !isNaN(date) ? date : null;
  return erzwungen;
}

/** Welcher Tag gerade gilt. */
export function heuteIst(date) {
  return date || erzwungen || new Date();
}

/** Ein Datum auf Mitternacht heruntergeschnitten – Tage rechnen sich sonst schief. */
function reinerTag(date) {
  const d = heuteIst(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Wie viele Tage von heute bis zu diesem Termin – 0 heißt heute.
 *
 * Über den Jahreswechsel hinweg: Steht der Termin dieses Jahr schon hinter
 * uns, zählt der nächste. Das Lichterfest am 21. Dezember ist am 27. Dezember
 * nicht „minus sechs Tage her", sondern in 360 Tagen wieder da.
 */
export function tageBis(termin, date) {
  return zielTag(termin, date).tage;
}

/** Das Datum, an dem dieser Termin das nächste Mal ist – und wie weit hin. */
function zielTag(termin, date) {
  const heute = reinerTag(date);
  let ziel = new Date(heute.getFullYear(), termin.monat, termin.tag);
  if (ziel < heute) ziel = new Date(heute.getFullYear() + 1, termin.monat, termin.tag);
  // Über Sommer- und Winterzeit hinweg hat ein Tag mal 23 und mal 25 Stunden.
  // Runden fängt das ab; ohne das wären im Herbst aus sieben Tagen
  // gelegentlich 6,96 und damit sechs.
  return { tage: Math.round((ziel - heute) / 86400000), jahr: ziel.getFullYear() };
}

/** Der Termin von heute – oder null. */
export function terminHeute(date) {
  const alle = alleTermine();
  for (let i = 0; i < alle.length; i++) {
    if (tageBis(alle[i], date) === 0) return alle[i];
  }
  return null;
}

/**
 * Was als Nächstes kommt, wenn es nah genug ist.
 *
 * HEUTE zählt hier nicht mit: Dafür gibt es `terminHeute`, und die beiden
 * dürfen nicht beide gleichzeitig dasselbe melden – sonst stünde am
 * Geburtstag „heute Geburtstag" und darunter „in 365 Tagen Geburtstag".
 *
 * @returns {object|null} der Termin mit `in` (1 … VORLAUF)
 */
export function naechsterTermin(date, vorlauf) {
  const weit = vorlauf == null ? VORLAUF : vorlauf;
  const alle = alleTermine();
  let best = null;
  for (let i = 0; i < alle.length; i++) {
    const z = zielTag(alle[i], date);
    if (z.tage < 1 || z.tage > weit) continue;
    // `jahr` ist das Jahr, in dem er STATTFINDET, nicht das heutige: Am
    // 28. Dezember liegt Nellys Geburtstag im nächsten. Daran hängt die
    // Marke, mit der sich das Spiel merkt, dass es schon Bescheid gesagt
    // hat – mit dem heutigen Jahr sagte es über Silvester zweimal an.
    if (!best || z.tage < best.in) {
      best = Object.assign({ in: z.tage, jahr: z.jahr }, alle[i]);
    }
  }
  return best;
}

/**
 * Wie es sich liest.
 *
 * „In 1 Tagen" ist der Satz, an dem ein sorgfältiges Spiel auffliegt –
 * deshalb steht „morgen" da, und bei zwei Tagen „übermorgen". Darüber wird
 * gezählt; ein „in einer Woche" wäre hübscher und bei sechs Tagen gelogen.
 */
export function wannText(tage) {
  if (tage <= 0) return 'heute';
  if (tage === 1) return 'morgen';
  if (tage === 2) return 'übermorgen';
  return 'in ' + tage + ' Tagen';
}
