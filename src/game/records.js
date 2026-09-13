/**
 * Fanggrößen – der Grund, denselben Fisch ein zweites Mal zu angeln.
 *
 * Bisher war jede Sardine dieselbe Sardine: einmal gefangen, im Fundbuch
 * abgehakt, danach nur noch Ware. Ein Maß je Fang macht daraus eine Reihe,
 * die nie ganz fertig ist – und das ist billiger und ehrlicher als ein
 * Museum, für das dieses Spiel zu klein ist.
 *
 * Die Größe hängt an drei Dingen: der Art (ein Wels ist kein Rotauge), der
 * Angelstufe (bessere Angel, größere Fische) und dem Zufall. Ein perfekter
 * Anhieb zählt zusätzlich – sonst wäre das Timing nur eine Stückzahlfrage.
 */
import { getItem } from './items.js';

/** Grundmaß je Seltenheit, in Zentimetern: [klein, groß]. */
const SPANNE = {
  1: [8, 22],
  2: [14, 34],
  3: [22, 52],
  4: [30, 68],
  5: [38, 92],
};

export function spanneFuer(itemId) {
  const item = getItem(itemId);
  const r = item && item.rarity ? item.rarity : 1;
  return SPANNE[r] || SPANNE[1];
}

/**
 * Ein Maß für diesen Fang.
 *
 * `rng` kommt von außen, damit der Test nicht würfeln muss. Zwei Würfe
 * gemittelt statt einem: Ein Gleichverteilter macht Rekorde beliebig, ein
 * gemittelter drückt die Masse zur Mitte und lässt die Ausreißer selten.
 */
export function rollSize(itemId, rodLevel, perfect, rng) {
  const sp = spanneFuer(itemId);
  const wuerfel = ((rng ? rng() : Math.random()) + (rng ? rng() : Math.random())) / 2;
  const stufe = Math.max(0, (rodLevel || 1) - 1) * 0.05;
  const gut = perfect ? 0.08 : 0;
  const t = Math.min(1, wuerfel + stufe + gut);
  return Math.round(sp[0] + (sp[1] - sp[0]) * t);
}

export function emptyRecords() {
  return Object.create(null);
}

/**
 * Trägt eine Größe ein, wenn sie die bisher beste ist.
 *
 * @returns {{neu: boolean, vorher: number, jetzt: number}}
 */
export function noteSize(records, itemId, cm) {
  const r = records || Object.create(null);
  const vorher = r[itemId] || 0;
  if (cm > vorher) {
    r[itemId] = cm;
    return { neu: true, vorher: vorher, jetzt: cm };
  }
  return { neu: false, vorher: vorher, jetzt: vorher };
}

export function bestSize(records, itemId) {
  return (records && records[itemId]) || 0;
}

/**
 * Wie besonders dieser Fang war – für die Meldung.
 *
 * „42 cm" allein sagt niemandem etwas, der nicht weiß, wie groß ein Wels
 * werden kann. Das Wort schon.
 */
export function sizeWord(itemId, cm) {
  const sp = spanneFuer(itemId);
  const t = (cm - sp[0]) / Math.max(1, sp[1] - sp[0]);
  if (t >= 0.92) return 'ein Prachtstück';
  if (t >= 0.7) return 'stattlich';
  if (t >= 0.3) return '';
  return 'ein Winzling';
}

/** Wie viele Arten schon ein Maß haben – für das Fundbuch. */
export function recordCount(records) {
  return records ? Object.keys(records).length : 0;
}
