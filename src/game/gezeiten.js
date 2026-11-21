/**
 * Die Gezeiten – der neue Raum ohne neue Karte.
 *
 * Das Kapitel „Die niedrige See" (Tag 12) stand lange als leere Hülle da und
 * kündigte an: „Das Wasser steht heute tiefer als sonst. Da hinten liegt
 * Grund frei." Das hier ist seine Einlösung.
 *
 * **Warum Gezeiten und nicht noch eine Ecke Insel.** Jeder weitere Bereich
 * macht die Karte größer und damit die Wege länger. Das Watt macht etwas
 * anderes: Es gibt denselben Rand der Insel an manchen Tagen eine zweite
 * Bedeutung. Der Strand, an dem man hundertmal vorbeigelaufen ist, ist heute
 * nicht zu Ende – das ist mehr Raum, ohne dass die Insel wächst.
 *
 * **Warum ein ganzer Inseltag und keine Uhrzeit.** Eine echte Tide stiege
 * und fiele zweimal am Tag; hier dauert ein Tag vierzehn Minuten. Vor allem
 * aber: Wenn das Wasser WÄHREND des Spielens zurückkäme, stünde Seli
 * plötzlich auf einer Kachel, die nicht mehr begehbar ist – und `canStand`
 * prüft nur Kacheln, also könnte sie sich keinen Schritt mehr bewegen. Das
 * wäre die schlimmste Sorte Strafe: eine, aus der man sich nicht befreien
 * kann.
 *
 * Deshalb ist Niedrigwasser eine Eigenschaft des TAGES. Der Wechsel
 * passiert, während man schläft, und kann niemanden überraschen. (Für den
 * Fall, dass ein Spielstand doch einmal mitten im Watt geladen wird, stellt
 * das Spiel die Figur frei – siehe `_gezeitenNachfuehren`.)
 *
 * **Warum es ein Fenster ist und kein Tageswurf.** Dieselbe Überlegung wie
 * beim Wanderer, und sie ist dort nachgemessen: Ein Wurf von 25 % je Tag
 * ergibt im Schnitt alle vier Tage Ebbe, aber im schlechtesten Fall wochenlang
 * keine. Das Fenster garantiert den Abstand.
 */
import { dailyRng } from '../core/rng.js';

/**
 * Die Länge des Fensters: Genau einmal je fünf Tage liegt der Grund frei.
 *
 * Fünf und nicht drei: Ein Watt, das jeden zweiten Tag da ist, ist Teil der
 * Insel und keine Gelegenheit. Fünf und nicht zehn: Wer einmal die Woche
 * spielt, soll es trotzdem erleben.
 */
export const FENSTER = 5;

/**
 * Ab welchem Inseltag überhaupt.
 *
 * Deckungsgleich mit dem Kapitel „Die niedrige See" in `kapitel.js`. Die
 * Zahl steht an beiden Stellen, weil die eine das Kapitel aufschlägt und die
 * andere den Rhythmus macht – ein Test hält sie zusammen.
 */
export const FRUEHESTENS = 12;

/**
 * Kleinster und größter Abstand zwischen zwei Ebben – beides geprüft.
 *
 * Nachgerechnet statt abgeschrieben: Der Tag im Fenster ist 0…FENSTER-1,
 * also ist der Abstand FENSTER + o(k+1) - o(k), und das liegt zwischen
 * 1 und 2·FENSTER-1. Hier stand zuerst `2 * FENSTER - 2` – aus dem
 * Wanderer übernommen, der seinen Tag aus 1…6 zieht und deshalb eine
 * andere Spanne hat. Der Test hat den Unterschied gefunden.
 */
export const ABSTAND_MIN = 1;
export const ABSTAND_MAX = 2 * FENSTER - 1;

/** Der Tag im Fenster: 0…4, anders als beim Wanderer auch der erste. */
function tagImFenster(seed, fenster) {
  return Math.floor(dailyRng(seed, fenster, 'gezeiten-fenster')() * FENSTER);
}

/** Liegt der Grund heute frei? */
export function niedrigAm(seed, tag) {
  if (!(tag >= FRUEHESTENS)) return false;
  const fenster = Math.floor((tag - FRUEHESTENS) / FENSTER);
  return tag === FRUEHESTENS + fenster * FENSTER + tagImFenster(seed, fenster);
}

/** Der nächste Tag mit Niedrigwasser – für „bald kannst du hinaus". */
export function naechstesNiedrig(seed, tag) {
  // Die Suche läuft ab dem Startpunkt und nicht ab `tag`.
  //
  // Hier stand `t < tag + 2 * FENSTER + 2`. Fragt man an Tag 1, beginnt die
  // Suche bei FRUEHESTENS (12) und endet bei 13 – zwei Tage, und auf vielen
  // Inseln liegt in diesen zweien keine Ebbe. Die Funktion gab dann 0
  // heraus, also „kommt nie", und zwar genau in dem Fall, in dem man sie am
  // ehesten fragt: bevor es losgeht.
  const start = Math.max(tag, FRUEHESTENS);
  for (let t = start; t < start + 2 * FENSTER + 2; t++) {
    if (niedrigAm(seed, t)) return t;
  }
  return 0;
}

/**
 * Wie weit der Grund frei liegt, in Kacheln vom Ufer aus.
 *
 * Drei. Bei einer wäre es ein Saum und keine Fläche; bei sechs liefe man
 * minutenlang über leeren Grund, und das Watt wäre eine zweite, langweilige
 * Insel. Gemessen sind drei Kacheln rund zweihundert Punkte – etwa so breit
 * wie der Strand selbst.
 */
export const BREITE = 3;

/**
 * Was im Watt liegt.
 *
 * Nichts Eigenes und nichts Neues: Muscheln und Treibholz gibt es am Strand
 * auch. Der Unterschied ist die MENGE und dass dazwischen Gegrabenes liegt –
 * ein Watt ist ein guter Fundtag an einem Ort, den es sonst nicht gibt.
 *
 * Ausdrücklich keine eigene Gattung „Wattgegenstand": Ein Fund, den es nur
 * alle fünf Tage gibt, wäre entweder belanglos oder ein Grund, auf die Ebbe
 * zu warten – und Warten ist das Gegenteil von dem, was dieses Spiel will.
 */
export const FUNDE = {
  arten: ['shell', 'driftwood', 'reeds'],
  boden: 'watt',
  n: 14,
  abstand: 64,
};

/** Wie viele Grabstellen zusätzlich im Watt liegen. */
export const GRABSTELLEN = 6;
