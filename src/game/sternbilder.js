/**
 * Sternbilder – der fünfte Erzählschritt.
 *
 * Gemessen hat das Spiel 28 Erzählschritte: sieben Geister mit je vier. Das
 * ist die ganze geschriebene Geschichte, und sie ist nach rund 180 Aufträgen
 * durch. Danach reden die Geister weiter, aber sie erzählen nichts mehr.
 *
 * Das ist die eigentliche Knappheit im Spiel – nicht die Zahl der
 * Gegenstände, nicht die Zahl der Rezepte. Und darum geht es hier: Jeder
 * Geist bekommt einen fünften Schritt, und zwar einen, der nicht aus einem
 * Auftrag kommt.
 *
 * **Warum am Himmel.** Die Nacht war bis hierher die Tageszeit ohne Aufgabe:
 * dunkler, leiser, Mondblumen auf, und sonst dasselbe. Ein Sternbild gibt ihr
 * einen Grund, ohne ihr eine Aufgabe zu geben – man findet es, weil man
 * nachts draußen steht, nicht weil man nachts draußen stehen SOLL.
 *
 * **Vier Regeln.**
 *
 * 1. **Es kommt NACH der Geschichte.** Ein Sternbild über Flämmchen taucht
 *    erst auf, wenn Flämmchens vier Schritte erzählt sind. Vorher wäre es ein
 *    Nachwort zu einem Buch, das man noch nicht gelesen hat. Deshalb ist es
 *    ein fünfter Schritt und kein Nebenschauplatz.
 * 2. **Nur bei klarem Himmel.** Regen, Nebel und Schnee verdecken ihn – das
 *    ist keine Schranke, sondern der Grund, warum eine klare Nacht sich von
 *    einer anderen unterscheidet.
 * 3. **Höchstens eines je Nacht.** Sieben Sätze an einem Abend sind kein
 *    Nachwort, sondern ein Abspann.
 * 4. **Es gibt nichts her.** Wie bei den Momenten: Ein Sternbild mit Beute
 *    wäre eine Aufgabe, und der Himmel wäre ein Vorrat.
 *
 * Die Sternlagen sind in Anteilen von 0 bis 1 angegeben und werden beim Malen
 * auf die Bildgröße gerechnet – so hängt keine Zahl hier an einer
 * Bildpunktgröße, die sich später ändert.
 */
import { SPIRIT_IDS, SPIRITS } from './spirits.js';

/**
 * Die Sternbilder, eines je Geist.
 *
 * `sterne`  Lagen in Anteilen [x, y] und, als drittes, die Helligkeit 1…3
 * `linien`  Paare von Sternnummern, die verbunden werden
 * `satz`    der fünfte Schritt – was der Geist dazu sagt
 *
 * Die Namen sind absichtlich keine echten Sternbilder: Diese Insel hat ihren
 * eigenen Himmel, und ein „Großer Wagen" würde das Spiel in unsere Welt
 * zurückholen.
 */
export const STERNBILDER = [
  {
    id: 'funke', geist: 'flamey', name: 'Der Funke',
    satz: 'Das da oben war ich. Vor sehr langer Zeit. Dann bin ich gefallen.',
    sterne: [[0.2, 0.7, 2], [0.4, 0.5, 3], [0.55, 0.3, 2], [0.75, 0.22, 1], [0.5, 0.72, 1]],
    linien: [[0, 1], [1, 2], [2, 3], [1, 4]],
  },
  {
    id: 'teppich', geist: 'mira', name: 'Der Moosteppich',
    satz: 'Sieben Sterne, ganz dicht. So wächst Moos auch – nie allein.',
    sterne: [[0.25, 0.35, 2], [0.4, 0.3, 1], [0.35, 0.5, 2], [0.5, 0.45, 3],
      [0.62, 0.35, 1], [0.6, 0.58, 2], [0.75, 0.5, 1]],
    linien: [[0, 1], [0, 2], [2, 3], [1, 3], [3, 4], [3, 5], [5, 6], [4, 6]],
  },
  {
    id: 'anker', geist: 'kiesel', name: 'Der Anker',
    satz: 'Danach bin ich gefahren. Vierzig Jahre. Er hat nie gelogen.',
    sterne: [[0.5, 0.2, 3], [0.5, 0.45, 2], [0.5, 0.65, 2], [0.3, 0.7, 1],
      [0.7, 0.7, 1], [0.35, 0.35, 1], [0.65, 0.35, 1]],
    linien: [[0, 1], [1, 2], [2, 3], [2, 4], [1, 5], [1, 6]],
  },
  {
    id: 'krone', geist: 'bruno', name: 'Die Baumkrone',
    satz: 'Ein Baum, der nie gefällt wird. Beruhigend, so etwas zu wissen.',
    sterne: [[0.5, 0.78, 2], [0.5, 0.55, 2], [0.32, 0.4, 1], [0.68, 0.4, 1],
      [0.42, 0.25, 3], [0.6, 0.22, 2], [0.5, 0.38, 1]],
    linien: [[0, 1], [1, 2], [1, 3], [1, 6], [6, 4], [6, 5], [2, 4], [3, 5]],
  },
  {
    id: 'rad', geist: 'tobi', name: 'Das Rad',
    satz: 'Acht Sterne im Kreis und einer in der Mitte. Wer das gebaut hat, war gut.',
    sterne: [[0.5, 0.5, 3], [0.5, 0.25, 1], [0.68, 0.32, 1], [0.75, 0.5, 1],
      [0.68, 0.68, 1], [0.5, 0.75, 1], [0.32, 0.68, 1], [0.25, 0.5, 1], [0.32, 0.32, 1]],
    linien: [[0, 1], [0, 3], [0, 5], [0, 7], [1, 2], [2, 3], [3, 4], [4, 5],
      [5, 6], [6, 7], [7, 8], [8, 1]],
  },
  {
    id: 'nadel', geist: 'nelly', name: 'Die Nadel',
    satz: 'Eine gerade Linie und ein Öhr. Mehr braucht es nicht, um etwas zu flicken.',
    sterne: [[0.25, 0.72, 1], [0.4, 0.6, 2], [0.55, 0.45, 2], [0.7, 0.3, 3],
      [0.78, 0.22, 1], [0.72, 0.18, 1]],
    linien: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 3]],
  },
  {
    id: 'watt', geist: 'wanda', name: 'Das Watt',
    satz: 'Das sind keine Sterne. Das sind Pfützen, die das Licht halten.',
    sterne: [[0.2, 0.6, 1], [0.35, 0.68, 2], [0.5, 0.6, 1], [0.44, 0.44, 2],
      [0.62, 0.5, 3], [0.78, 0.42, 1], [0.7, 0.66, 1], [0.3, 0.45, 1]],
    linien: [[0, 1], [1, 2], [2, 4], [3, 4], [4, 5], [2, 6], [4, 6], [0, 7], [7, 3]],
  },
  {
    id: 'grat', geist: 'silke', name: 'Der Grat',
    satz: 'Eine Kante, die nicht herunterfällt. Daran halte ich mich fest.',
    sterne: [[0.16, 0.74, 1], [0.3, 0.56, 2], [0.42, 0.62, 1], [0.54, 0.38, 3],
      [0.66, 0.46, 1], [0.8, 0.26, 2], [0.88, 0.4, 1]],
    linien: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]],
  },
];

export const STERNBILD_IDS = STERNBILDER.map(function (s) { return s.id; });

/** Ein Sternbild nach Kennung – oder `null`. */
export function sternbildVon(id) {
  for (let i = 0; i < STERNBILDER.length; i++) {
    if (STERNBILDER[i].id === id) return STERNBILDER[i];
  }
  return null;
}

/** Das Sternbild eines Geistes – oder `null`. */
export function sternbildFuerGeist(geistId) {
  for (let i = 0; i < STERNBILDER.length; i++) {
    if (STERNBILDER[i].geist === geistId) return STERNBILDER[i];
  }
  return null;
}

/** Der Name des Geistes, dem es gehört. */
export function geistName(s) {
  return s && SPIRITS[s.geist] ? SPIRITS[s.geist].name : '';
}

/** Leerer Stand – wie `emptyMomente`. */
export function emptySternbilder() {
  return { gefunden: Object.create(null), zuletzt: 0 };
}

/** Ist dieses Sternbild schon gefunden? */
export function gefunden(stand, id) {
  return !!(stand && stand.gefunden && stand.gefunden[id]);
}

/** Wurde in dieser Nacht schon eines gefunden? */
export function heuteSchon(stand, tag) {
  return !!(stand && stand.zuletzt === tag);
}

/**
 * Ist der Himmel überhaupt zu sehen?
 *
 * Nacht und kein Wetter. Beides kommt aus `ruheLage()`, derselben Quelle wie
 * bei den Momenten – ein zweiter Begriff von „klarer Nacht" neben dem
 * bestehenden wäre die Sorte Doppelung, die auseinanderläuft.
 */
export function himmelFrei(lage) {
  const l = lage || {};
  return !!l.nacht && !l.wetter;
}

/**
 * Welches Sternbild jetzt zu finden ist – oder `null`.
 *
 * `fertig` sagt, von welchen Geistern die Geschichte erzählt ist; ohne das
 * wäre ein Sternbild ein Nachwort zu einem ungelesenen Buch (Regel 1).
 *
 * In der Reihenfolge der Geister, nicht nach Zufall: So kommt zuerst das
 * Sternbild des Geistes, den man am längsten kennt, und die Reihe liest sich
 * später in der Chronik wie der Weg, den man gegangen ist.
 */
export function faelligesSternbild(stand, lage, tag, fertig) {
  if (!himmelFrei(lage)) return null;
  if (heuteSchon(stand, tag)) return null;
  const istFertig = typeof fertig === 'function' ? fertig : function () { return false; };
  for (let i = 0; i < SPIRIT_IDS.length; i++) {
    const s = sternbildFuerGeist(SPIRIT_IDS[i]);
    if (!s) continue;
    if (gefunden(stand, s.id)) continue;
    if (!istFertig(s.geist)) continue;
    return s;
  }
  return null;
}

/** Eines eintragen. Gibt den neuen Stand heraus. */
export function merke(stand, id, tag) {
  const s = stand && stand.gefunden ? stand : emptySternbilder();
  s.gefunden[id] = tag;
  s.zuletzt = tag;
  return s;
}

/** Was gefunden wurde, in der Reihenfolge des Findens – für die Chronik. */
export function gefundene(stand) {
  const raus = [];
  for (let i = 0; i < STERNBILDER.length; i++) {
    const s = STERNBILDER[i];
    const tag = stand && stand.gefunden ? stand.gefunden[s.id] : 0;
    if (tag) raus.push({ sternbild: s, tag: tag });
  }
  raus.sort(function (a, b) { return a.tag - b.tag; });
  return raus;
}

/** Wie viele gefunden sind und wie viele es gibt. */
export function sternbilderStand(stand) {
  let n = 0;
  for (let i = 0; i < STERNBILDER.length; i++) {
    if (gefunden(stand, STERNBILDER[i].id)) n++;
  }
  return { gefunden: n, gesamt: STERNBILDER.length };
}
