/**
 * Feste – vier Tage im Jahr, an denen die Insel anders aussieht.
 *
 * Die Insel hatte schon zwei Sorten Kalender: die Jahreszeit, die ein
 * Vierteljahr lang gilt, und das Tagesereignis, das sich nach einer
 * Zufallszahl richtet und an jedem vierten Tag ausfällt. Was fehlte, war
 * dazwischen – ein **Termin**. Etwas, von dem man WEISS, dass es kommt, und
 * auf das man sich freuen kann.
 *
 * Ein Fest ist genau das:
 *
 *   1. Es steht an einem **festen Datum**, jedes Jahr am selben Tag.
 *   2. Die Insel **sieht anders aus** – ums Lager herum steht Schmuck, der
 *      am nächsten Morgen wieder weg ist.
 *   3. **Jeder Geist sagt etwas dazu**, einmal an dem Tag, mit eigenen
 *      Worten für jedes Fest.
 *   4. Es gibt **etwas, das es nur an dem Tag gibt** – von jedem Geist eine
 *      Gabe, einmal.
 *
 * Ein Fest schlägt das Tagesereignis: Zwei Besonderheiten an einem Tag wären
 * keine mehr, und der Markttag kommt ohnehin jede Woche wieder.
 *
 * **Nichts davon ist verpflichtend.** Wer am Lichterfest nicht spielt, hat
 * nichts verloren, was er nicht nächstes Jahr wiederbekäme – dieselbe Regel
 * wie beim Geburtstag. Ein Fest, das man verpassen KANN, wäre ein Termin mit
 * Strafe, und davon gibt es hier keine.
 */

/**
 * Die vier Feste.
 *
 * Ein Datum je Jahreszeit, und jedes liegt sicher in seiner: Der 1. Mai ist
 * Frühling (Monate 2–4), der 21. Juni Sommer (5–7), der 12. Oktober Herbst
 * (8–10), der 21. Dezember Winter (11, 0, 1). Ein Test rechnet das nach,
 * denn ein „Erntefest" im Frühling wäre schwer zu erklären.
 *
 * Die beiden Sonnenwenden sind mit Absicht dabei: Der längste und der
 * kürzeste Tag sind die zwei Termine, die eine Insel ohne Uhr selbst merkt.
 *
 * `schmuck` sagt, was ums Lager herum aufgestellt wird – lauter Grafiken,
 * die es ohnehin gibt. Neue zu malen wäre schöner, aber vier Feste, die aus
 * Vorhandenem gebaut sind, kommen ins Spiel; vier, für die erst zwanzig
 * Bilder fehlen, kommen nicht.
 */
export const FESTE = {
  bluete: {
    id: 'bluete',
    name: 'Blütenfest',
    season: 'spring',
    datum: { monat: 4, tag: 1 },
    hint: 'Die ganze Insel blüht. Heute wird geschmückt.',
    icon: 'icon_flower_pink',
    schmuck: ['flowerbox', 'arch', 'flowerbed', 'planter'],
    gabe: { items: [{ id: 'seed_flower', n: 2 }], ember: 8 },
  },
  sonnwend: {
    id: 'sonnwend',
    name: 'Mittsommernacht',
    season: 'summer',
    datum: { monat: 5, tag: 21 },
    hint: 'Der längste Tag. Nachts bleibt es hell genug zum Sitzen.',
    icon: 'icon_sparkle',
    // Die Fackel steht zweimal drin: Bei acht Stueck wird die Liste
    // reihum durchlaufen, und so brennen doppelt so viele Fackeln wie
    // Lichterketten. Das ist die Sonnenwende, kein Gartenfest.
    schmuck: ['torch', 'stringlights', 'mat', 'torch'],
    gabe: { items: [{ id: 'moonflower', n: 2 }], ember: 10 },
  },
  ernte: {
    id: 'ernte',
    name: 'Erntefest',
    season: 'autumn',
    datum: { monat: 9, tag: 12 },
    hint: 'Alles ist eingebracht. Auf der Wiese stehen lange Tische.',
    icon: 'icon_berry',
    schmuck: ['table', 'bench', 'clothesline', 'bookstack'],
    gabe: { items: [{ id: 'berry', n: 3 }, { id: 'mushroom', n: 2 }], ember: 10 },
  },
  lichter: {
    id: 'lichter',
    name: 'Lichterfest',
    season: 'winter',
    datum: { monat: 11, tag: 21 },
    hint: 'Die längste Nacht. Überall brennt Licht.',
    icon: 'icon_lantern',
    schmuck: ['lantern', 'paperlamp', 'stonelamp', 'firebowl'],
    gabe: { items: [{ id: 'gem', n: 1 }], ember: 14 },
  },
  // Das fünfte Fest, und das einzige, bei dem zwei auf eine Jahreszeit
  // fallen. Das ist kein Versehen: Der Dezember HAT zwei Termine, und
  // zwischen der längsten Nacht und dem Heiligabend liegen drei Tage, in
  // denen die Adventstanne weiterwächst. Eines davon wegzulassen, nur damit
  // die Tabelle vier Zeilen hat, wäre Buchhaltung.
  heiligabend: {
    id: 'heiligabend',
    name: 'Heiligabend',
    season: 'winter',
    datum: { monat: 11, tag: 24 },
    hint: 'Heute sind alle am Feuer.',
    icon: 'icon_lantern',
    schmuck: ['stringlights', 'lantern', 'firebowl', 'torch'],
    gabe: { items: [{ id: 'dish_berrycake', n: 1 }], ember: 16 },
    // Dieser eine Termin kündigt sich selbst an, und zwar besser als jede
    // Vorschauzeile: Ab dem 1. Dezember steht die Adventstanne am Lager und
    // zählt sichtbar herunter. Die Vorschau zeigt immer nur den NÄCHSTEN
    // Termin; zwischen dem 17. und dem 20. ist das Lichterfest, am 21. ist
    // es selbst dran – der Heiligabend käme darin nur am 22. und 23. vor.
    // Wer wöchentlich spielt, sähe ihn also nie kommen. Mit dem Baum sieht
    // er ihn drei Wochen lang.
    eigeneAnkuendigung: 'Adventstanne',
  },
};

export const FEST_IDS = Object.keys(FESTE);

/** Wie weit ums Lager der Schmuck aufgestellt wird. */
export const SCHMUCK_RADIUS = 300;

/** Wie viele Stücke Schmuck ein Fest aufstellt. */
export const SCHMUCK_ANZAHL = 8;

/**
 * Wie viel Platz ein Stück Schmuck um sich braucht.
 *
 * Knapp genug, dass im Lager überhaupt etwas hinpasst – dort stehen schon
 * Zelt, Werkbank, Laden, Briefkasten, Truhe, Kochstelle und alles, was der
 * Spieler selbst aufgestellt hat.
 */
export const SCHMUCK_ABSTAND = 56;

/**
 * Welches Fest heute ist – oder null.
 *
 * Wie bei den Geburtstagen am ECHTEN Datum, nicht am Inseltag: Ein Fest, das
 * am 37. Inseltag liegt, ist kein Termin, sondern eine Wegmarke. Man soll am
 * 21. Dezember daran denken können, dass auf der Insel Lichterfest ist.
 */
export function festOn(date) {
  const d = date || new Date();
  const m = d.getMonth();
  const t = d.getDate();
  for (let i = 0; i < FEST_IDS.length; i++) {
    const f = FESTE[FEST_IDS[i]];
    if (f.datum.monat === m && f.datum.tag === t) return f;
  }
  return null;
}

/**
 * Was jeder Geist zu welchem Fest sagt.
 *
 * Eine eigene Tabelle statt einer Gruppe im Geplauder: Der Festsatz kommt
 * EINMAL am Tag und geht allem anderen vor, so wie der Geburtstagsgruß. Im
 * Geplauder läge er in einem Topf mit dem Wetter und käme vielleicht gar
 * nicht – ausgerechnet an dem einen Tag, an dem er zählt.
 *
 * Dieselben sieben Stimmen wie in `talk.js`, und dieselbe Regel: kein Satz
 * zweimal, keiner erteilt einen Auftrag.
 */
export const FEST_SATZ = {
  bluete: {
    flamey: 'Überall bunt! Sogar auf mir.',
    mira: 'Das ist mein Tag. Riech mal, wie das duftet.',
    kiesel: 'Blumen. Na gut, meinetwegen.',
    bruno: 'Der halbe Wald steht voll. Hmpf. Schön.',
    tobi: 'Ich habe versucht, eine zu bauen. Ging nicht.',
    nelly: 'Ich habe mir welche ins Haar gesteckt. Sieht man es?',
    wanda: 'Sogar hier drüben treibt heute etwas an.',
  },
  sonnwend: {
    flamey: 'Heute bin ich der Kleinste. Die Sonne ist größer.',
    mira: 'Es wird kaum dunkel. Die Wiese schläft gar nicht.',
    kiesel: 'Längster Tag. Da wurde früher durchgefahren.',
    bruno: 'Zu lange hell. Aber der Wald findet es gut.',
    tobi: 'Vierzehn Stunden Licht. Vierzehn Stunden Werkstatt!',
    nelly: 'Von hier oben sieht man die Sonne kaum untergehen.',
    wanda: 'Das Wasser glüht bis spät. Bleib doch.',
  },
  ernte: {
    flamey: 'Alle bringen was. Ich halte das Feuer.',
    mira: 'Eingebracht ist eingebracht. Jetzt wird gegessen.',
    kiesel: 'Volle Netze, volle Körbe. So muss das.',
    bruno: 'Der Wald hat dieses Jahr ordentlich geliefert.',
    tobi: 'Ich habe die Tische gebaut. Sie halten. Wahrscheinlich.',
    nelly: 'Ich habe für alle gedeckt. Auch für die, die nicht kommen.',
    wanda: 'Drüben ist Fest. Ich höre es bis hierher.',
  },
  lichter: {
    flamey: 'Die längste Nacht! Da bin ich wichtig.',
    mira: 'Unter dem Schnee wartet schon alles aufs nächste Jahr.',
    kiesel: 'Jedes Licht hier ist eines mehr als draußen auf See.',
    bruno: 'Dunkel wie im Dickicht. Nur wärmer.',
    tobi: 'Ich habe alle Lampen nachgesehen. Alle gehen.',
    nelly: 'Ich zähle heute die Lichter. Es sind mehr als letztes Jahr.',
    wanda: 'Ich sehe euer Feuer von hier aus. Das reicht mir heute.',
  },
  // Am Heiligabend stehen sie alle am selben Feuer – der einzige Abend im
  // Jahr, an dem das so ist. Die Sätze sind deshalb nicht an ihren Orten
  // gesprochen, sondern nebeneinander.
  heiligabend: {
    flamey: 'Alle da. Ich brenne heute besonders ordentlich.',
    mira: 'Ich habe Zweige mitgebracht. Mehr brauchte es nie.',
    kiesel: 'Einmal im Jahr liegt das Boot fest. Heute.',
    bruno: 'Ich bleibe nicht lange. … Na gut, ein bisschen.',
    tobi: 'Ich habe nichts gebaut heute. Fühlt sich komisch an. Gut komisch.',
    nelly: 'Ich habe für alle gedeckt. Heute kommen auch alle.',
    wanda: 'Ich bin den ganzen Weg herübergekommen. Sag nichts.',
  },
};

/** Der Satz eines Geistes zum Fest – oder leer. */
export function festSatz(festId, spiritId) {
  const f = FEST_SATZ[festId];
  return (f && f[spiritId]) || '';
}

/** Leerer Feststand – merkt sich, wer heute schon gratuliert hat. */
export function emptyFeste() {
  return Object.create(null);
}
