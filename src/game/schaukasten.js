/**
 * Becken und Falterkasten – wohin die Fänge gehen.
 *
 * Fische und Falter landeten bis hierher im Fundbuch, in der Küche und in
 * Bitten – und damit **nirgends, wo man sie ansieht**. `records.js` gibt
 * jedem Fang ein Maß in Zentimetern, und diese Zahl lebte danach in einer
 * Liste. Angel und Zimmer berührten einander an keiner Stelle.
 *
 * Ein Museum wäre die naheliegende Antwort und steht in `records.js`
 * ausdrücklich als „zu groß für dieses Spiel" verworfen. Das hier ist die
 * kleine Fassung davon: **zwei Möbelstücke, die zeigen, was man gefangen
 * hat.**
 *
 * **Sie verlangen keine Verwaltung.** Man wählt nicht aus, was hineinkommt,
 * es gibt kein Einsetzen und kein Herausnehmen – das Becken zeigt von selbst
 * die drei besten Fische, der Kasten die drei seltensten Falter. Ein Fenster
 * mit Auswahllisten wäre mehr Bedienung als Freude, und es gäbe eine Art,
 * sein Becken „falsch" einzurichten. Davon gibt es hier nichts.
 *
 * **Und sie zählen nichts Neues mit** – dieselbe Regel wie bei der Chronik.
 * Was gezeigt wird, steht längst im Spielstand.
 */
import { getItem, CAT } from './items.js';
import { spanneFuer } from './records.js';

/** Wie viele Tiere in ein Stück passen. */
export const PLAETZE = 3;

/**
 * Was dieses Möbelstück zeigt – oder null.
 *
 * Am Gegenstand und nicht an einer Liste im Renderer: Wer ein drittes
 * Schaustück dazunimmt, trägt es hier ein und ist fertig.
 */
export const ZEIGT = {
  aquarium: 'fisch',
  buttercase: 'falter',
};

export function zeigtWas(itemId) {
  return ZEIGT[itemId] || null;
}

/**
 * Die Fische im Becken – die drei besten.
 *
 * „Beste" heißt: am nächsten an dem, was die ART hergibt, nicht am längsten
 * in Zentimetern. Sonst schwämmen dort für immer die drei größten Arten und
 * nie die 21-cm-Sardine, die das eigentliche Kunststück war. Dieselbe
 * Rechnung wie bei der Chronik – und aus demselben Grund.
 */
export function fischeImBecken(records, plaetze) {
  const n = plaetze == null ? PLAETZE : plaetze;
  const liste = [];
  for (const id in (records || {})) {
    const cm = records[id];
    const it = getItem(id);
    if (!cm || !it || it.cat !== CAT.FISH) continue;
    const sp = spanneFuer(id);
    liste.push({ id: id, cm: cm, anteil: (cm - sp[0]) / Math.max(1, sp[1] - sp[0]) });
  }
  // Bei Gleichstand nach Kennung, damit die Reihenfolge nicht davon abhängt,
  // in welcher Reihenfolge die Fänge im Spielstand stehen.
  liste.sort(function (a, b) { return b.anteil - a.anteil || (a.id < b.id ? -1 : 1); });
  return liste.slice(0, n);
}

/**
 * Die Falter im Kasten – die drei seltensten.
 *
 * Falter haben kein Maß; für sie gibt es nur „schon gefangen". Genommen wird
 * deshalb, was am schwersten zu bekommen war: der Wert steht dafür ein, denn
 * er ist im ganzen Spiel an die Seltenheit gekoppelt.
 */
export function falterImKasten(found, plaetze) {
  const n = plaetze == null ? PLAETZE : plaetze;
  const liste = [];
  for (const id in (found || {})) {
    if (!found[id]) continue;
    const it = getItem(id);
    if (!it || it.cat !== CAT.BUG) continue;
    liste.push({ id: id, wert: it.value, n: found[id] });
  }
  liste.sort(function (a, b) { return b.wert - a.wert || (a.id < b.id ? -1 : 1); });
  return liste.slice(0, n);
}

/**
 * Was in diesem Stück zu sehen ist – die eine Frage, die der Renderer stellt.
 *
 * `lage` ist bewusst nur `{records, found}` und kein `Game`: So lässt sich
 * das hier ohne Browser prüfen.
 *
 * @returns {Array} [{id, cm}] – höchstens `PLAETZE` Einträge
 */
export function inhaltVon(itemId, lage) {
  const art = zeigtWas(itemId);
  const l = lage || {};
  if (art === 'fisch') return fischeImBecken(l.records);
  if (art === 'falter') return falterImKasten(l.found);
  return [];
}

/**
 * Das Schaufenster jedes Stücks – gemessen vom FUSSPUNKT der Grafik.
 *
 * Steht hier und nicht im Renderer, weil zwei Stellen es wissen müssen:
 * drinnen und draußen wird verschieden gezeichnet, und beide sollen
 * denselben Fisch an derselben Stelle zeigen. Genau dieselbe Überlegung wie
 * bei den Fenstermaßen in `interior.js` – zwei Rechnungen laufen irgendwann
 * auseinander, und dann schwimmt der Fisch neben dem Becken.
 *
 * Die Zahlen stammen aus den Malern: Beim Becken liegt das Wasser zwischen
 * 138 und 60 Punkten über dem Fußpunkt, beim Kasten der Papiergrund zwischen
 * 120 und 48.
 */
export const FENSTER = {
  aquarium: { cy: -99, w: 132, h: 66, groesse: 46 },
  buttercase: { cy: -84, w: 88, h: 56, groesse: 34 },
};

/** Die drei Plätze im Schaufenster, als Anteil seiner Breite und Höhe. */
export const PLAETZE_XY = [
  { x: -0.26, y: -0.2 },
  { x: 0.2, y: 0.02 },
  { x: -0.08, y: 0.24 },
];

/**
 * Wohin die Tiere gezeichnet werden – Versatz zum Fußpunkt, in Bildpunkten.
 *
 * @returns {Array} [{id, dx, dy, groesse}]
 */
export function plaetzeVon(itemId, lage) {
  const f = FENSTER[itemId];
  if (!f) return [];
  const inhalt = inhaltVon(itemId, lage);
  const raus = [];
  for (let i = 0; i < inhalt.length && i < PLAETZE_XY.length; i++) {
    const p = PLAETZE_XY[i];
    raus.push({
      id: inhalt[i].id,
      dx: Math.round(p.x * f.w),
      dy: Math.round(f.cy + p.y * f.h),
      groesse: f.groesse,
    });
  }
  return raus;
}
