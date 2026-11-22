/**
 * Die Adventszeit – vierundzwanzig Tage, an denen die Insel etwas vorhat.
 *
 * Das Spiel hatte drei Sorten Kalender: die Jahreszeit (ein Vierteljahr),
 * das Tagesereignis (gewürfelt, jeder vierte Tag fällt aus) und das Fest
 * (ein Tag, vier im Jahr). Was fehlte, war etwas, das über **Wochen**
 * läuft und jeden Tag ein Stück weiterkommt. Genau das ist ein
 * Adventskalender: nicht ein Termin, sondern eine Strecke.
 *
 * Am Lager steht vom 1. bis zum 26. Dezember eine Tanne. Jeden Tag lässt
 * sich ein Türchen öffnen; jedes geöffnete Türchen ist ein Licht mehr an
 * ihr. Wer alle vierundzwanzig öffnet, hat am Heiligabend einen Baum, der
 * den ganzen Lagerplatz wärmt – und wer erst am Zwölften anfängt, hat ihn
 * auch, nur später.
 *
 * **Verpasste Türchen bleiben offen.** Das ist die eine Entscheidung, an
 * der alles hängt. Ein Adventskalender, bei dem der Fünfte weg ist, wenn
 * man am Sechsten aufschließt, wäre ein Kalender mit Strafe – und davon
 * gibt es hier keine. Wer am 20. zum ersten Mal hereinschaut, findet
 * zwanzig Türchen vor und darf sie alle öffnen. Das ist nicht „geschummelt",
 * das ist, wie man einen Kalender nachholt, den man eine Woche vergessen
 * hat: der Reihe nach, an einem Abend.
 *
 * Umgekehrt lässt sich **nicht vorgreifen**. Der Dreiundzwanzigste ist am
 * Zweiten noch zu. Sonst wäre die Strecke kein Advent, sondern eine Liste.
 *
 * Alles hier ist eine reine Rechnung auf einem übergebenen Datum und einem
 * übergebenen Stand – also ohne Browser und ohne Warten prüfbar.
 */

/** Der Monat, in dem das alles spielt (0 = Januar). */
export const MONAT = 11;

/** Erstes und letztes Türchen. */
export const ERSTES = 1;
export const LETZTES = 24;

/**
 * Bis wann die Tanne steht.
 *
 * Zwei Tage über den Heiligabend hinaus: Ein Baum, der am 25. morgens weg
 * ist, nimmt den Feiertagen das, wofür sie da sind. Am 27. räumt ihn
 * niemand ab – er ist einfach nicht mehr da, so wie der Festschmuck.
 */
export const BAUM_BIS = 26;

/**
 * Die vierundzwanzig Türchen.
 *
 * Der Satz ist die eigentliche Gabe. Die Dinge dahinter sind klein und
 * absichtlich klein: Ein Adventskalender, aus dem jeden Tag etwas
 * Wertvolles fällt, ist ein Automat. Was einen Kalender ausmacht, ist, dass
 * jemand sich für jeden einzelnen Tag etwas überlegt hat.
 *
 * Deshalb steht hinter einigen Türchen auch **gar nichts** außer dem Satz.
 * Die sind die besten.
 *
 * Alle Gaben bestehen aus Dingen, die es schon gibt. Vierundzwanzig neue
 * Gegenstände zu malen, wäre schöner – aber ein Advent aus Vorhandenem kommt
 * ins Spiel, und einer, für den erst zwanzig Bilder fehlen, kommt nicht.
 */
export const TUERCHEN = [
  { tag: 1, text: 'Der erste Schnee bleibt liegen. Flämmchen hat die ganze Nacht durchgebrannt, damit du es morgens siehst.', gabe: { items: [{ id: 'wood', n: 4 }] } },
  { tag: 2, text: 'Jemand hat einen Kranz an die Werkbank gehängt. Niemand sagt, wer.', gabe: { items: [{ id: 'wreath_winter', n: 1 }] } },
  { tag: 3, text: 'Mira hat unter dem Schnee nachgesehen. Es wächst noch etwas da unten.', gabe: { items: [{ id: 'herb', n: 2 }] } },
  { tag: 4, text: 'Heute ist es so still, dass man das Eis am Ufer knacken hört.', gabe: null },
  { tag: 5, text: 'Käpt’n Kiesel hat Treibholz gestapelt. „Für lange Abende", sagt er.', gabe: { items: [{ id: 'driftwood', n: 3 }] } },
  { tag: 6, text: 'Vor dem Zelt stehen Stiefel. Darin: Nüsse, Beeren und ein Stein, der aussieht wie ein Herz.', gabe: { items: [{ id: 'berry', n: 3 }, { id: 'stone', n: 2 }] } },
  { tag: 7, text: 'Tobi hat Lichterketten gefunden. Dreiviertel davon gehen sogar.', gabe: { items: [{ id: 'stringlights', n: 1 }] } },
  { tag: 8, text: 'Der Rauch steht heute gerade nach oben. Das bedeutet Frost, sagt Bruno.', gabe: { items: [{ id: 'resin', n: 2 }] } },
  { tag: 9, text: 'Nelly hat gezählt: Es sind mehr Lichter als letztes Jahr. Sie hat recht.', gabe: null },
  { tag: 10, text: 'Im Briefkasten liegt eine Karte ohne Absender. Darauf nur: „Bis bald."', gabe: { coins: 40 } },
  { tag: 11, text: 'Auf dem Wasser schwimmt eine Laterne. Wanda sagt, die war nicht von ihr.', gabe: { items: [{ id: 'lantern', n: 1 }] } },
  { tag: 12, text: 'Die Hälfte. Von hier aus sieht man beide Enden.', gabe: { ember: 6 } },
  { tag: 13, text: 'Heute kam niemand vorbei. Das Feuer hat trotzdem gebrannt.', gabe: null },
  { tag: 14, text: 'Frostblüten am Bachrand. Sie halten bis mittags, dann sind sie Wasser.', gabe: { items: [{ id: 'frostflower', n: 1 }] } },
  { tag: 15, text: 'Bruno hat Tannenzweige gebracht. Wortlos. Er stellt so etwas einfach hin.', gabe: { items: [{ id: 'fiber', n: 3 }] } },
  { tag: 16, text: 'Jemand hat im Schnee einen Weg zum Wasser getreten. Jetzt muss niemand mehr stapfen.', gabe: { items: [{ id: 'stone', n: 4 }] } },
  { tag: 17, text: 'Kiesel erzählt von einem Winter, in dem die Bucht zufror. Dreimal erzählt er es. Es wird nicht schlechter.', gabe: { items: [{ id: 'fish_cod', n: 1 }] } },
  { tag: 18, text: 'Es riecht nach Gebackenem. Woher, sagt keiner.', gabe: { items: [{ id: 'dish_berrycake', n: 1 }] } },
  { tag: 19, text: 'Die Nacht ist klar. Man sieht alles, was man kennt, und darüber noch mehr.', gabe: { items: [{ id: 'stardust', n: 1 }] } },
  { tag: 20, text: 'Mira hat einen Zweig ins Wasserglas gestellt. „Der blüht noch", sagt sie. Niemand widerspricht.', gabe: { items: [{ id: 'seed_flower', n: 1 }] } },
  { tag: 21, text: 'Die längste Nacht. Ab morgen wird es wieder heller – nur merkt man es noch nicht.', gabe: { ember: 10 } },
  { tag: 22, text: 'Tobi hat etwas gebaut und es wieder abgebaut. „War nichts." Es war etwas.', gabe: { items: [{ id: 'hardwood', n: 2 }] } },
  { tag: 23, text: 'Alles ist vorbereitet. Es ist der schönste Tag, weil morgen noch kommt.', gabe: null },
  { tag: 24, text: 'Heiligabend. Sie sind alle da.', gabe: { items: [{ id: 'gem', n: 1 }], ember: 14 } },
];

/** Das Türchen zu einer Nummer – oder null. */
export function tuerchen(nr) {
  for (let i = 0; i < TUERCHEN.length; i++) if (TUERCHEN[i].tag === nr) return TUERCHEN[i];
  return null;
}

/**
 * Die höchste heute erlaubte Nummer – oder 0.
 *
 * Am echten Datum, wie Geburtstage und Feste: Ein Advent, der am 37.
 * Inseltag anfängt, ist keiner. Nach dem 24. bleibt die Zahl bei 24 stehen,
 * solange der Baum noch steht – wer zwischen den Jahren vorbeischaut, darf
 * nachholen, was er verpasst hat.
 */
export function adventNummer(date) {
  const d = date || new Date();
  if (d.getMonth() !== MONAT) return 0;
  const t = d.getDate();
  if (t < ERSTES) return 0;
  if (t > BAUM_BIS) return 0;
  return Math.min(t, LETZTES);
}

/** Steht heute die Tanne? */
export function istAdvent(date) {
  return adventNummer(date) > 0;
}

/** Ist heute Heiligabend? */
export function istHeiligabend(date) {
  const d = date || new Date();
  return d.getMonth() === MONAT && d.getDate() === LETZTES;
}

/** Leerer Stand. */
export function emptyAdvent() {
  return { offen: [] };
}

/**
 * Einen gespeicherten Stand einlesen.
 *
 * Säubert dabei: Doppelte, Nummern außerhalb von 1 bis 24 und alles, was
 * keine Zahl ist, fliegen raus. Ein Spielstand kann von Hand bearbeitet
 * worden sein, und eine 99 im Feld hieße sonst ein Baum mit 99 Lichtern.
 */
export function adventAus(roh) {
  const stand = emptyAdvent();
  const liste = roh && Array.isArray(roh.offen) ? roh.offen : [];
  const gesehen = Object.create(null);
  for (let i = 0; i < liste.length; i++) {
    const nr = Math.floor(Number(liste[i]));
    if (!(nr >= ERSTES && nr <= LETZTES)) continue;
    if (gesehen[nr]) continue;
    gesehen[nr] = 1;
    stand.offen.push(nr);
  }
  stand.offen.sort(function (a, b) { return a - b; });
  return stand;
}

/** Ist dieses Türchen schon offen? */
export function istOffen(stand, nr) {
  return !!stand && stand.offen.indexOf(nr) >= 0;
}

/**
 * Das nächste Türchen, das sich öffnen lässt – oder 0.
 *
 * Der Reihe nach, das kleinste zuerst. Wer eine Woche nicht da war, arbeitet
 * sich von vorn durch und liest die Sätze in der Reihenfolge, in der sie
 * geschrieben sind. Das kleinste offene zuerst zu nehmen statt das heutige
 * ist der ganze Unterschied zwischen Nachholen und Überspringen.
 */
export function naechstesTuerchen(stand, date) {
  const bis = adventNummer(date);
  if (!bis) return 0;
  for (let nr = ERSTES; nr <= bis; nr++) {
    if (!istOffen(stand, nr)) return nr;
  }
  return 0;
}

/** Wie viele Türchen heute noch offenstehen. */
export function offeneAnzahl(stand, date) {
  const bis = adventNummer(date);
  if (!bis) return 0;
  let n = 0;
  for (let nr = ERSTES; nr <= bis; nr++) if (!istOffen(stand, nr)) n++;
  return n;
}

/**
 * Ein Türchen öffnen.
 *
 * Gibt zurück, was dahintersteckt – oder null, wenn es das Türchen nicht
 * gibt, schon offen ist oder heute noch zu bleibt. Der Stand wird dabei
 * verändert; das Austeilen der Gabe macht der Aufrufer, weil nur der das
 * Gepäck kennt.
 */
export function oeffne(stand, nr, date) {
  if (!stand) return null;
  const bis = adventNummer(date);
  if (!(nr >= ERSTES && nr <= bis)) return null;
  if (istOffen(stand, nr)) return null;
  const t = tuerchen(nr);
  if (!t) return null;
  stand.offen.push(nr);
  stand.offen.sort(function (a, b) { return a - b; });
  return t;
}

/** Wie viele Lichter am Baum brennen. */
export function lichter(stand) {
  return stand ? stand.offen.length : 0;
}

/** So viele Stufen hat die Tanne. */
export const BAUM_STUFEN = 5;

/**
 * Welche Stufe die Tanne gerade zeigt.
 *
 * Fünf Stufen für vierundzwanzig Türchen, nicht fünfundzwanzig Grafiken:
 * Der Unterschied zwischen elf und zwölf Lichtern sieht niemand, der
 * zwischen einem kahlen und einem halb geschmückten Baum schon. Stufe 0 ist
 * die nackte Tanne, Stufe 4 der volle Baum – und die erreicht man erst mit
 * dem letzten Türchen, nicht schon bei zwanzig.
 */
export function baumStufe(stand) {
  const n = lichter(stand);
  if (n >= LETZTES) return 4;
  if (n <= 0) return 0;
  return 1 + Math.min(2, Math.floor((n - 1) / 8));
}

/**
 * Was am Baum steht, wenn man davorsteht.
 *
 * Drei Fälle, und alle drei sind freundlich: Es wartet etwas, es wartet
 * mehr als eines, oder man ist durch.
 */
export function baumText(stand, date) {
  const offen = offeneAnzahl(stand, date);
  if (!offen) {
    const n = lichter(stand);
    if (n >= LETZTES) return 'Alle vierundzwanzig brennen.';
    return n === 1 ? 'Ein Licht brennt. Morgen kommt das nächste.'
      : n + ' Lichter brennen. Morgen kommt das nächste.';
  }
  if (offen === 1) return 'Ein Türchen ist noch zu.';
  return offen + ' Türchen sind noch zu.';
}
