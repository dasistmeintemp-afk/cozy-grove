/**
 * Die Fassade – wie dein Zuhause von außen aussieht.
 *
 * **Warum das fehlte.** Drinnen konnte man seit Langem Wand und Boden
 * wählen; draußen stand für jeden dasselbe hellbeige Haus mit braunem
 * Dach. Dabei ist das Haus das Einzige, was man von Weitem sieht – und
 * ausgerechnet daran war nichts eigenes. Die Bewohnerhütten hatten längst
 * farbige Dächer: `paintHouse` nimmt seit ihnen `wand`, `dach` und `tuer`
 * entgegen. Es gab also nichts zu bauen, nur etwas zu wählen.
 *
 * **Kostenlos, wie drinnen.** Wand und Boden kosten nichts, weil am
 * eigenen Zuhause nichts Pflicht sein soll. Für die Fassade gilt dasselbe:
 * Eine Hausfarbe, die Münzen kostet, wäre eine Hausfarbe, die man sich
 * erst verdient – und dann stünde die halbe Insel in der Farbe, die am
 * billigsten war.
 *
 * **Erst ab der Hütte.** Ein Zelt hat keine Wand zum Streichen. Die
 * Auswahl erscheint mit der zweiten Ausbaustufe, zusammen mit den vier
 * Wänden.
 *
 * **Die erste Farbe lässt alles offen.** `kalk` nennt keine Werte, und das
 * ist Absicht: `paintHouse` setzt dann seine eigenen ein – und die sind je
 * Stufe verschieden (das Haus mit Veranda hat ein dunkleres Dach als die
 * Hütte). Stünden hier feste Zahlen, hätte die Voreinstellung die Stufen
 * eingeebnet, und niemand hätte gemerkt, dass dabei etwas verloren geht.
 */

/** Ab dieser Ausbaustufe gibt es etwas zu streichen. */
export const FASSADE_AB = 2;

export const HAUSFARBEN = [
  {
    // Kein einziger Wert: siehe oben. Das ist das Haus, wie es immer war.
    id: 'kalk', name: 'Kalk und Kastanie',
    // Nur fürs Pünktchen in der Liste – gemalt wird damit nichts.
    probeWand: '#e0c49c', probeDach: '#a2704a',
  },
  {
    id: 'moos', name: 'Moos und Eiche',
    wand: '#d9ddc6', wandSchatten: '#b5bb9e',
    dach: '#6b7a54', dachSchatten: '#4c583a', tuer: '#6b5536',
    probeWand: '#d9ddc6', probeDach: '#6b7a54',
  },
  {
    id: 'abend', name: 'Abendblau',
    wand: '#d2dae6', wandSchatten: '#aab8cb',
    dach: '#4f6076', dachSchatten: '#384658', tuer: '#5d6c82',
    probeWand: '#d2dae6', probeDach: '#4f6076',
  },
  {
    id: 'ziegel', name: 'Ziegel und Kalk',
    wand: '#f1e7d7', wandSchatten: '#d4c7b1',
    dach: '#b04a2e', dachSchatten: '#813020', tuer: '#8a5a38',
    probeWand: '#f1e7d7', probeDach: '#b04a2e',
  },
  {
    id: 'treibholz', name: 'Treibholz und Teer',
    wand: '#cec1ad', wandSchatten: '#a99b86',
    dach: '#4a4740', dachSchatten: '#32302b', tuer: '#6e6457',
    probeWand: '#cec1ad', probeDach: '#4a4740',
  },
];

export const HAUSFARBE_IDS = HAUSFARBEN.map(function (f) { return f.id; });

/** Die Fassade zu einer Kennung – oder die erste, wenn es sie nicht gibt. */
export function hausfarbeFuer(id) {
  for (let i = 0; i < HAUSFARBEN.length; i++) {
    if (HAUSFARBEN[i].id === id) return HAUSFARBEN[i];
  }
  return HAUSFARBEN[0];
}

/**
 * Die Malvorgaben für `paintHouse` – nur die Felder, die wirklich gesetzt
 * sind.
 *
 * Ein `undefined` im Objekt ist für `paintHouse` dasselbe wie ein
 * fehlendes Feld (es steht dort überall `o.wand || …`), aber hier wird es
 * trotzdem weggelassen: So sieht man der Rückgabe an, dass `kalk`
 * wirklich nichts vorgibt.
 */
export function malvorgabeFuer(id) {
  const f = hausfarbeFuer(id);
  const out = {};
  const felder = ['wand', 'wandSchatten', 'dach', 'dachSchatten', 'tuer'];
  for (let i = 0; i < felder.length; i++) {
    if (f[felder[i]]) out[felder[i]] = f[felder[i]];
  }
  return out;
}

/** Eine gespeicherte Kennung säubern. */
export function hausfarbeAus(roh) {
  return HAUSFARBE_IDS.indexOf(roh) >= 0 ? roh : HAUSFARBE_IDS[0];
}
