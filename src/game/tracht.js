/**
 * Die Trachten – was Seli anhat.
 *
 * Bis hierher sah sie an Tag 1 aus wie an Tag 300. Alles andere auf dieser
 * Insel richtet sich nach Jahreszeit und Fortschritt – die Farben, die
 * Fische, die Falter, die Weisen –, und ausgerechnet die Figur, die man in
 * jeder Sekunde ansieht, war das einzige, was sich nie änderte.
 *
 * **Eine Tracht wechselt die Kleider, nicht Seli.** Haar und Augen stehen in
 * keiner davon: Sie ist blond und blauäugig, das ist sie. Durchgesetzt wird
 * das nicht hier, sondern im Maler (`KLEIDER` in `painted-camp.js`) – der
 * sieht sich gar nichts anderes an. Eine Tracht, die Haarfarbe mitbrächte,
 * würde sie schlicht nicht beachten.
 *
 * **Verdient, nicht gekauft.** Keine kostet Münzen. Drei Gründe: Münzen
 * haben mit der Vorratstruhe und dem Katalog schon zwei große Ziele; ein
 * Kleid im Laden wäre ein drittes und würde beiden Zeit wegnehmen. Eine
 * Tracht ist außerdem nichts, was man BRAUCHT – wer sie nicht will, soll
 * nichts verpassen, und wer sie will, soll sie nicht abwägen müssen. Und:
 * Jede hängt an etwas, das man ohnehin tut, also ist sie eine Erinnerung an
 * einen Tag und kein Posten.
 *
 * **Nichts verdirbt.** Einmal offen, immer offen – auch wenn das Fest
 * vorbei ist. Wer im Winter anfängt, bekommt die Blütentracht im Frühling,
 * nicht nie.
 */

/**
 * Die Farben.
 *
 * Nur Kleiderfarben (siehe `KLEIDER` im Maler). Jede Tracht setzt ALLE
 * Stücke, auch wenn eines davon gleich bliebe: Halbe Trachten, die ein Stück
 * der vorigen stehen lassen, sehen je nachdem, was man vorher anhatte,
 * anders aus – und dann ist es keine Tracht mehr, sondern ein Zufall.
 *
 * Die Schattenfarbe ist überall dieselbe Farbe, nur dunkler und etwas
 * satter. Der Maler legt sie als zweiten Auftrag versetzt darüber; zwei
 * unverwandte Farben ergeben dabei keinen Schatten, sondern einen Fleck.
 */
export const TRACHTEN = [
  {
    id: 'standard',
    name: 'Wie immer',
    // Die Farben, mit denen sie angefangen hat. Sie stehen hier NOCH EINMAL
    // und nicht als Verweis auf `SELI`: Sonst wäre die erste Tracht die
    // einzige ohne eigene Zeile, und wer die Liste liest, müsste an zwei
    // Stellen nachsehen, was Seli anhat.
    top: '#7fb0bd', topShade: '#5b8c9a',
    skirt: '#e0836d', skirtShade: '#bb6150',
    tights: '#e8dcc2', scarf: '#f2c063',
    hat: '#c98a4c', hatShade: '#a06a37',
    boot: '#8c6a4a', pack: '#9fa877', packShade: '#7d8659',
    ab: null,
  },
  {
    id: 'bluete',
    name: 'Blütenkleid',
    woher: 'Vom Blütenfest',
    // Frühling: helles Rosa, Blattgrün, heller Strohhut.
    top: '#f0b6c4', topShade: '#cc8b9c',
    skirt: '#8fb87a', skirtShade: '#6d9459',
    tights: '#f2ead6', scarf: '#e8879f',
    hat: '#e4cf95', hatShade: '#bda86d',
    boot: '#7d6a52', pack: '#c3d19c', packShade: '#9aa877',
    ab: { fest: 'bluete' },
  },
  {
    id: 'sonnwend',
    name: 'Sonnwendkleid',
    woher: 'Von der Sonnwendfeier',
    // Sommer: Leinenweiß und tiefes Meerblau, nichts Schweres.
    top: '#f4ecd8', topShade: '#cfc3a8',
    skirt: '#4f8fa8', skirtShade: '#396a80',
    tights: '#f2ead6', scarf: '#f0a64e',
    hat: '#efe3bd', hatShade: '#c4b489',
    boot: '#a08765', pack: '#dcd2b0', packShade: '#b0a684',
    ab: { fest: 'sonnwend' },
  },
  {
    id: 'ernte',
    name: 'Erntekittel',
    woher: 'Vom Erntedank',
    // Herbst: Rostrot, Ocker, dunkles Braun.
    top: '#c9743f', topShade: '#a05628',
    skirt: '#8a6b3c', skirtShade: '#6a5029',
    tights: '#ddd0b0', scarf: '#b34f36',
    hat: '#a8823f', hatShade: '#83632c',
    boot: '#6f5539', pack: '#9c8450', packShade: '#7a663a',
    ab: { fest: 'ernte' },
  },
  {
    id: 'lichter',
    name: 'Lichtermantel',
    woher: 'Vom Lichterfest',
    // Winter: tiefes Blau, warmes Rot, Pelzkragen. Die dunkelste von allen –
    // und genau deshalb bekommt sie das hellste Halstuch.
    top: '#3f4f7a', topShade: '#2c385a',
    skirt: '#7b3b48', skirtShade: '#5c2b36',
    tights: '#e4dcc8', scarf: '#f0e2c0',
    hat: '#4a5a86', hatShade: '#343f63',
    boot: '#544033', pack: '#6b7390', packShade: '#4e5470',
    ab: { fest: 'lichter' },
  },
  {
    id: 'wanderer',
    name: 'Wandertracht',
    woher: 'Vom Wanderer',
    // Was er selbst anhat: Erdfarben, Staub, ein verwaschenes Grün. Die
    // einzige Tracht, die nicht von der Insel kommt.
    top: '#8d9a72', topShade: '#6c7856',
    skirt: '#7a6a55', skirtShade: '#5c4f3e',
    tights: '#d8cfb6', scarf: '#b8724d',
    hat: '#6e6250', hatShade: '#524839',
    boot: '#5f4c39', pack: '#a3906a', packShade: '#7f7050',
    ab: { wanderer: 4 },
  },
];

export const TRACHT_IDS = TRACHTEN.map(function (t) { return t.id; });

/** Die Tracht zu einer Kennung – oder die erste, falls es sie nicht gibt. */
export function trachtFuer(id) {
  for (let i = 0; i < TRACHTEN.length; i++) {
    if (TRACHTEN[i].id === id) return TRACHTEN[i];
  }
  return TRACHTEN[0];
}

/**
 * Ist diese Tracht schon offen?
 *
 * Gelesen wird eine ausdrückliche Liste im Spielstand und nicht der Zustand
 * der Feste. Naheliegend wäre gewesen, in `state.feste` nachzusehen, ob man
 * beim Blütenfest war – aber dort steht je GEIST eine Marke, und die wird
 * beim nächsten Fest überschrieben. Eine Tracht, die nach dem übernächsten
 * Fest wieder verschwindet, wäre das Gegenteil von „nichts verdirbt".
 *
 * @param {object} tracht aus TRACHTEN
 * @param {string[]} offene Kennungen aus dem Spielstand
 */
export function offen(tracht, offene) {
  if (!tracht) return false;
  if (!tracht.ab) return true;
  return !!offene && offene.indexOf(tracht.id) >= 0;
}

/** Welche Tracht ein Fest mitbringt – oder null. */
export function trachtZuFest(festId) {
  for (let i = 0; i < TRACHTEN.length; i++) {
    const t = TRACHTEN[i];
    if (t.ab && t.ab.fest === festId) return t.id;
  }
  return null;
}

/** Welche Tracht der Wanderer bei diesem Tausch mitbringt – oder null. */
export function trachtVomWanderer(tauschZahl) {
  for (let i = 0; i < TRACHTEN.length; i++) {
    const t = TRACHTEN[i];
    if (t.ab && t.ab.wanderer === (tauschZahl | 0)) return t.id;
  }
  return null;
}

/** Alle Trachten mit dem Vermerk, ob sie offen sind. */
export function trachtenStand(offene) {
  return TRACHTEN.map(function (t) {
    return {
      id: t.id,
      name: t.name,
      woher: t.woher || null,
      offen: offen(t, offene),
    };
  });
}

/** Wie viele offen sind – für die Zeile im Fenster. */
export function offeneZahl(offene) {
  let n = 0;
  for (let i = 0; i < TRACHTEN.length; i++) if (offen(TRACHTEN[i], offene)) n++;
  return n;
}

/**
 * Die Liste aus einem Spielstand – was auch immer dort steht.
 *
 * Ein alter Stand hat das Feld nicht, ein beschädigter hat Unsinn darin.
 * Beides gibt dieselbe leere Liste: Wer lädt, soll spielen können.
 */
export function offeneAus(roh) {
  if (!Array.isArray(roh)) return [];
  const raus = [];
  for (let i = 0; i < roh.length; i++) {
    const id = roh[i];
    if (typeof id !== 'string') continue;
    if (TRACHT_IDS.indexOf(id) < 0) continue;
    if (raus.indexOf(id) < 0) raus.push(id);
  }
  return raus;
}
