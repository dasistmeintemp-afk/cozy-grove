/**
 * Die Chronik – was aus all den Tagen geworden ist.
 *
 * Der Tagesrückblick zeigt **einen** Tag und ist am nächsten Morgen weg. Über
 * die ganze Zeit gab es bis hierher nichts: keine Antwort auf „wie lange bin
 * ich schon hier", „was habe ich eigentlich alles gefangen", „wie groß war
 * der größte". Wer sechs Wochen auf dieser Insel verbracht hat, konnte das
 * nirgends sehen.
 *
 * **Sie zählt nichts Neues mit.** Das ist die ganze Idee: Die Zahlen liegen
 * längst im Spielstand – das Fundbuch weiß, wie viel von jeder Sorte je in
 * der Tasche lag, `records.js` kennt jeden Rekord, das Aufgabenbuch die
 * erfüllten Bitten. Eine zweite Buchführung daneben wäre eine zweite
 * Wahrheit, die irgendwann von der ersten abweicht – und ein Spielstand, der
 * sie nicht hat, stünde auf Null.
 *
 * **Sechs Zeilen, keine Tabelle.** Es gäbe gut zwanzig Zahlen; zwanzig Zahlen
 * sind eine Abrechnung. Hier stehen die, von denen man jemandem erzählen
 * würde.
 */
import { getItem, ITEM_LIST, CAT } from './items.js';
import { spanneFuer } from './records.js';

/**
 * Wie viele Dinge insgesamt je in der Tasche lagen.
 *
 * Aus dem Fundbuch gerechnet. Es zählt bei JEDEM `add` mit – Gefundenes,
 * Gekauftes, Gebautes, Gefischtes. Deshalb heißt die Zeile „in der Tasche
 * gehabt" und nicht „gesammelt": Das eine wäre gelogen.
 */
export function dingeGesamt(found) {
  let n = 0;
  for (const id in (found || {})) n += found[id] || 0;
  return n;
}

/** Wie viele Arten das Fundbuch kennt – und wie viele es überhaupt gibt. */
export function artenStand(found) {
  const kennt = Object.keys(found || {}).length;
  // Erinnerungen und Andenken zählen nicht mit: Sie kommen aus den
  // Geschichten, nicht aus der Welt, und eine Zahl, die man nicht durch
  // Suchen vollmachen kann, gehört nicht in eine Fortschrittszeile.
  let gibt = 0;
  for (let i = 0; i < ITEM_LIST.length; i++) {
    const id = ITEM_LIST[i].id;
    if (id.indexOf('memory_') === 0 || id.indexOf('keepsake_') === 0) continue;
    gibt++;
  }
  return { kennt: Math.min(kennt, gibt), gibt: gibt };
}

/**
 * Der größte Fang – Art und Maß.
 *
 * Nicht die größte Zahl in Zentimetern: Ein Wels wird nun einmal länger als
 * eine Sardine, und dann stünde dort für immer derselbe Fisch. Gemessen wird,
 * wie nah der Fang an dem war, was diese ART hergibt – eine 21-cm-Sardine ist
 * das größere Kunststück als ein mittelmäßiger Wels.
 */
export function groessterFang(records) {
  let best = null;
  for (const id in (records || {})) {
    const cm = records[id];
    if (!cm) continue;
    const sp = spanneFuer(id);
    const anteil = (cm - sp[0]) / Math.max(1, sp[1] - sp[0]);
    if (!best || anteil > best.anteil) {
      best = { id: id, cm: cm, anteil: anteil, name: (getItem(id) || {}).name || id };
    }
  }
  return best;
}

/** Wie viele Bitten insgesamt erfüllt wurden. */
export function bittenGesamt(completedBySpirit) {
  let n = 0;
  for (const id in (completedBySpirit || {})) n += completedBySpirit[id] || 0;
  return n;
}

/**
 * Ein Satz zu der Zeit, die vergangen ist.
 *
 * Wie die Wohnstufe im Zimmer: kein Rang und keine Rechte, nur ein Wort.
 * Die Schwellen sind an Inseltagen gemessen, und ein Inseltag dauert
 * vierzehn Minuten – Tag 60 ist also kein Jubiläum, sondern ein guter
 * Nachmittag mal vier.
 */
export const ZEIT_SAETZE = [
  { ab: 0, text: 'Gerade erst angekommen.' },
  { ab: 8, text: 'Die Wege sind schon vertraut.' },
  { ab: 25, text: 'Lange genug, um zu wissen, wo was wächst.' },
  { ab: 60, text: 'Das hier ist kein Aufenthalt mehr. Das ist Zuhause.' },
  { ab: 140, text: 'Die Insel und du kennt einander inzwischen ziemlich gut.' },
];

export function zeitSatz(tage) {
  let s = ZEIT_SAETZE[0];
  for (let i = 0; i < ZEIT_SAETZE.length; i++) {
    if ((tage || 0) >= ZEIT_SAETZE[i].ab) s = ZEIT_SAETZE[i];
  }
  return s.text;
}

/**
 * Die Chronik als Zeilen.
 *
 * `lage` ist bewusst nur eine Handvoll roher Werte und kein `Game`: So lässt
 * sich das hier ohne Browser und ohne halbes Spiel prüfen – dieselbe Naht wie
 * bei `rollSize`, das seinen Zufall übergeben bekommt.
 *
 * @param {object} lage {tag, farbe, found, caught, records, bitten, meilensteine}
 * @returns {Array} [{icon, wert, text}]
 */
export function chronikZeilen(lage) {
  const l = lage || {};
  const arten = artenStand(l.found);
  const gross = groessterFang(l.records);
  const raus = [
    {
      key: 'tage', icon: 'icon_day',
      wert: String(l.tag || 1),
      text: (l.tag || 1) === 1 ? 'Tag auf der Insel' : 'Tage auf der Insel',
    },
    {
      key: 'farbe', icon: 'icon_color',
      wert: Math.round((l.farbe || 0) * 100) + ' %',
      text: 'der Insel wieder bunt',
    },
    {
      key: 'bitten', icon: 'icon_check',
      wert: String(l.bitten || 0),
      text: (l.bitten || 0) === 1 ? 'Bitte erfüllt' : 'Bitten erfüllt',
    },
    {
      key: 'arten', icon: 'icon_bookstack',
      wert: arten.kennt + ' von ' + arten.gibt,
      text: 'Dingen schon einmal begegnet',
    },
    {
      key: 'dinge', icon: 'icon_bag',
      wert: String(dingeGesamt(l.found)),
      text: 'Dinge in der Tasche gehabt',
    },
  ];
  // Der größte Fang steht nur da, wenn überhaupt einer geangelt wurde. Eine
  // Zeile „größter Fang: –" wäre ein Vorwurf, und das Spiel macht keine.
  if (gross) {
    raus.push({
      key: 'fang', icon: 'icon_' + gross.id,
      wert: gross.cm + ' cm',
      text: 'größter Fang: ' + gross.name,
    });
  }
  return raus;
}

/** Nur zur Sicherheit: Fische haben eine Spanne, alles andere nicht. */
export function istFisch(id) {
  const it = getItem(id);
  return !!(it && it.cat === CAT.FISH);
}
