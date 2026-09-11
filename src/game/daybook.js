/**
 * Der Tagesrückblick – die Strichliste eines Tages.
 *
 * Beim Schlafen wird gezählt, was Seli getan hat, und am nächsten Morgen
 * steht es in einem Fenster: vier Bitten erfüllt, zwei Fische, ein Beet
 * gegossen. Das ist die einzige Stelle, an der das Spiel auf einen ganzen Tag
 * zurückblickt – und die einzige Belohnung, die nichts kostet und nichts
 * verlangt.
 *
 * **Warum es diese Datei gibt.** Die Strichliste stand an drei Stellen:
 * angelegt wurde sie in `game.js`, gezeigt in `panels.js`, und ob sich das
 * Fenster überhaupt lohnt, entschied eine dritte Liste daneben. Die drei sind
 * auseinandergelaufen, und zwar still: **Gericht gekocht**, **Wunsch erfüllt**
 * und **Reihe im Fundbuch voll** wurden jeden Tag mitgezählt und tauchten
 * nirgends auf. Wer eine Reihe im Fundbuch vollmachte – das Seltenste, was an
 * einem Tag passieren kann –, sah am nächsten Morgen kein Wort davon.
 *
 * Jetzt gibt es eine Liste. Wer etwas dazuzählt, trägt es hier ein, und alle
 * drei Stellen wissen davon. Ein Test hält fest, dass es dabei bleibt.
 */

/**
 * Was gezählt wird, und wie es im Rückblick heißt.
 *
 * Die Reihenfolge ist die im Fenster, und sie erzählt einen Tag: erst, was
 * man für jemanden getan hat, dann was man gefunden und gemacht hat, zuletzt
 * das Erreichte und der Ertrag.
 *
 * Einzahl und Mehrzahl stehen beide da, weil „1 Bitten erfüllt" der Satz ist,
 * an dem ein sorgfältiges Spiel auffliegt.
 */
export const DAYBOOK_ROWS = [
  { key: 'quests', icon: 'icon_check', ein: 'Bitte erfüllt', mehr: 'Bitten erfüllt' },
  { key: 'wish', icon: 'icon_ghost', ein: 'Wunsch erfüllt', mehr: 'Wünsche erfüllt' },
  { key: 'finds', icon: 'icon_sparkle', ein: 'Fundstück gehoben', mehr: 'Fundstücke gehoben' },
  { key: 'fish', icon: 'icon_fish_trout', ein: 'Fisch gefangen', mehr: 'Fische gefangen' },
  { key: 'bugs', icon: 'icon_net', ein: 'Falter gefangen', mehr: 'Falter gefangen' },
  { key: 'decor', icon: 'icon_flowerbed', ein: 'Stück aufgestellt', mehr: 'Stücke aufgestellt' },
  { key: 'planted', icon: 'icon_seed_berry', ein: 'Beet gesät', mehr: 'Beete gesät' },
  { key: 'harvest', icon: 'icon_berry', ein: 'Beet geerntet', mehr: 'Beete geerntet' },
  { key: 'watered', icon: 'icon_can', ein: 'Beet gegossen', mehr: 'Beete gegossen' },
  { key: 'gezogen', icon: 'icon_flower_dusk', ein: 'Dämmerblume gezogen', mehr: 'Dämmerblumen gezogen' },
  { key: 'gekocht', icon: 'icon_dish_forestsoup', ein: 'Gericht gekocht', mehr: 'Gerichte gekocht' },
  { key: 'gifts', icon: 'icon_heart', ein: 'Mitbringsel verschenkt', mehr: 'Mitbringsel verschenkt' },
  { key: 'sets', icon: 'icon_bookstack', ein: 'Reihe im Fundbuch voll', mehr: 'Reihen im Fundbuch voll' },
  { key: 'milestones', icon: 'icon_star', ein: 'Meilenstein erreicht', mehr: 'Meilensteine erreicht' },
  { key: 'coins', icon: 'icon_coin', ein: 'Münze verdient', mehr: 'Münzen verdient' },
  { key: 'ember', icon: 'icon_ember', ein: 'Glut gesammelt', mehr: 'Glut gesammelt' },
];

export const DAYBOOK_KEYS = DAYBOOK_ROWS.map(function (r) { return r.key; });

/**
 * Eine frische Strichliste.
 *
 * Sie liegt in `state` und wandert damit in den Spielstand: Wer mitten am Tag
 * aufhört und morgen weitermacht, soll am nächsten Morgen den ganzen Tag
 * sehen, nicht nur den Rest nach dem Laden.
 */
export function emptyDaybook(day, colorStart) {
  const b = { day: day, colorStart: colorStart, colorEnd: colorStart };
  for (let i = 0; i < DAYBOOK_KEYS.length; i++) b[DAYBOOK_KEYS[i]] = 0;
  // Wem geholfen wurde – daraus wird morgen früh die Post. Keine Zahl,
  // deshalb steht es nicht in der Liste oben.
  b.helped = Object.create(null);
  return b;
}

/**
 * Lohnt sich das Fenster überhaupt?
 *
 * An einem Tag, an dem nichts passiert ist, geht es gar nicht erst auf. Auch
 * das gehört zum Ton des Spiels: Ein Rückblick auf lauter Nullen wäre ein
 * Vorwurf.
 *
 * Die Farbe zählt mit, denn sie kann auch ohne Strich gewachsen sein.
 */
export function daybookHasContent(b) {
  if (!b) return false;
  for (let i = 0; i < DAYBOOK_KEYS.length; i++) {
    if (b[DAYBOOK_KEYS[i]] > 0) return true;
  }
  return (b.colorEnd - b.colorStart) > 0.002;
}
