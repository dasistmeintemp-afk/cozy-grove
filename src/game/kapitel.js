/**
 * Kapitel – der zweite Bogen.
 *
 * Gemessen hatte das Spiel ein Strukturproblem, und es ist ein anderes als
 * das Kurzstreckenproblem, das die Meilensteine gelöst haben. Die Zahlen:
 *
 *   128 Gegenstände, 46 Rezepte, 23 Katalogeinträge, 9 Gerichte
 *    28 Erzählschritte – sieben Geister mit je vier. Das ist die GANZE
 *       Geschichte des Spiels.
 *    11 Meilensteine – und alle elf hängen an derselben einen Zahl, dem
 *       Anteil der eingefärbten Insel.
 *
 * Der letzte Punkt ist der wichtige. Elf Stationen auf EINEM Balken sind kein
 * Bogen, sondern eine Skala mit Strichen. Wer bei 100 % ankommt, hat nicht
 * ein Kapitel beendet, sondern das Spiel – danach bleiben die Wunschplätze,
 * und die sind ein Verfahren, kein Inhalt: Sie mischen dieselben 128 Dinge neu.
 *
 * Deshalb sind Kapitel hier ausdrücklich KEINE weiteren Prozentstufen. Sie
 * sind eine zweite Achse, und die ist die Zeit.
 *
 * **Warum die Zeit die richtige Achse ist.** Animal Crossing hält nicht
 * deshalb jahrelang, weil es mehr Inhalt hätte, sondern weil sein Inhalt an
 * den echten Kalender gebunden ist: Man KANN den Dezember nicht vorziehen.
 * Dieses Spiel macht das halb schon – Jahreszeiten und Tagesereignisse hängen
 * am Datum des Rechners (siehe `calendar.js`). Was fehlte, war dasselbe
 * Prinzip für den eigenen Fortschritt: etwas, das kommt, weil man eine Weile
 * da ist, und nicht, weil man etwas abgearbeitet hat.
 *
 * **Vier Regeln, die ein Kapitel von einem Meilenstein unterscheiden:**
 *
 * 1. **Es kommt mit der Zeit, nicht mit der Leistung.** `ab` ist ein Inseltag.
 *    Ein Inseltag dauert vierzehn Minuten, also ist das eine Spielzeit und
 *    keine Schranke: Man kann sie nicht überspringen und nicht verfehlen.
 * 2. **Es endet nicht.** Kapitel schließen einander nicht ab, sie legen sich
 *    übereinander. Wenn das vierte aufgeht, gilt alles aus dem zweiten
 *    weiter. Ein Kapitel, das etwas wegnimmt, wäre ein Korridor; so wird die
 *    Insel voller statt anders.
 * 3. **Es bringt etwas, was es vorher nicht gab.** Kein Kapitel gibt nur
 *    einen Namen und eine Urkunde – jedes bringt eine Sache, die man vorher
 *    nicht tun konnte. Sonst wären es Zwischentitel.
 * 4. **Es lässt sich nicht verpassen.** Wie der Geburtstag und der Wanderer:
 *    Wer drei Wochen nicht spielt, findet das Kapitel vor, wenn er
 *    wiederkommt. Ein Kapitel mit Termin wäre eine Strafe, und davon gibt es
 *    hier keine.
 *
 * **Warum trotzdem ein Boden aus Fortschritt.** `boden` ist ein Mindestanteil
 * eingefärbter Insel, und er ist absichtlich niedrig. Er ist keine zweite
 * Schranke, sondern eine Sicherung: Wer zwölf Inseltage lang nur am Strand
 * sitzt, hat keine Werkzeuge und kein Lager, und ein Kapitel, das ihm neue
 * Fundorte aufmacht, ginge an ihm vorbei. Der Boden liegt deshalb überall
 * deutlich unter dem, was man an diesem Tag normalerweise erreicht hat – die
 * Zeit bleibt das Maß, der Boden fängt nur den Ausnahmefall.
 *
 * Alles hier ist eine reine Rechnung auf Tag und Anteil – ohne Browser und
 * ohne Spielstand prüfbar, wie `calendar.js` und `termine.js`.
 */

/**
 * Die Kapitel, aufsteigend.
 *
 * `id`      Schlüssel im Spielstand
 * `ab`      frühester Inseltag (die eigentliche Achse)
 * `boden`   Mindestanteil eingefärbter Insel (0..1) – nur die Sicherung
 * `name`    was im Tagebuch und in der Meldung steht
 * `auftakt` der eine Satz am Morgen, an dem es aufgeht
 * `hint`    was es ab jetzt zu tun gibt
 * `bringt`  Kennungen der Sachen, die dieses Kapitel dauerhaft hinzufügt;
 *           das Spiel fragt damit ab, ob eine Sache schon existiert
 *           (siehe `kapitelHat`)
 * `inhalt`  ob es die Sache im Spiel WIRKLICH schon gibt
 *
 * **Zu `inhalt`, und warum es dieses Feld gibt.** Die fünf Kapitel standen
 * zuerst alle in dieser Liste, und alle fünf gingen auf – auch die, deren
 * Inhalt noch nicht gebaut war. Das Spiel meldete an Tag 12 „Das Wasser
 * steht heute tiefer als sonst. Da hinten liegt Grund frei", und es gab
 * keine Gezeiten; an Tag 55 „Am Strand steht Gepäck. Jemand bleibt", und es
 * kam niemand.
 *
 * Das ist derselbe Fehler, der beim Tagesereignis „Steinkraut" schon einmal
 * aufgefallen ist – ein Versprechen ohne Deckung –, nur schlimmer: Ein
 * stiller Tag fällt niemandem auf, ein angekündigter Nachbar, der nie
 * kommt, schon. Ein Kapitel mit `inhalt: false` bleibt deshalb zu, bis es
 * etwas zu halten gibt. Ein Test liest die Quellen und hält beides
 * gegeneinander: Was ein offenes Kapitel mitbringt, muss das Spiel auch
 * abfragen.
 *
 * Die Abstände wachsen: 1 → 12 → 30 → 55 → 90. Das ist kein Zufall und auch
 * keine Bequemlichkeit. Wer neu ist, braucht schnell ein Zeichen, dass es
 * weitergeht; wer am neunzigsten Tag noch da ist, spielt ohnehin nicht auf
 * das nächste Kapitel hin, sondern weil er gern hier ist. Ein gleichmäßiges
 * Raster hätte am Anfang zu lange gewartet und am Ende zu oft geklingelt.
 */
export const KAPITEL = [
  {
    /**
     * Das erste Kapitel hat keinen Auftakt und keine Gabe – es ist der
     * Zustand, in dem man anfängt.
     *
     * Es steht trotzdem in der Liste, und das ist eine bewusste Entscheidung:
     * Wer am ersten Tag ins Tagebuch sieht, soll dort „Ankunft" lesen und
     * nicht „noch kein Kapitel". Ein Bogen, der erst beim zweiten Punkt
     * anfängt, sieht von vorn wie keiner aus.
     */
    id: 'ankunft', ab: 1, boden: 0, inhalt: true,
    name: 'Ankunft',
    auftakt: '',
    hint: 'Die Insel liegt grau da. Das ändert sich.',
    icon: 'icon_map',
    bringt: [],
  },
  {
    id: 'niedrigesee', ab: 12, boden: 0.08, inhalt: false,
    name: 'Die niedrige See',
    auftakt: 'Das Wasser steht heute tiefer als sonst. Da hinten liegt Grund frei.',
    hint: 'Bei Niedrigwasser ist der Meeresboden begehbar.',
    icon: 'icon_shell',
    bringt: ['gezeiten'],
  },
  {
    id: 'klarerhimmel', ab: 30, boden: 0.25, inhalt: true,
    name: 'Der klare Himmel',
    auftakt: 'Nachts ist der Himmel aufgeklart. Man sieht mehr als sonst.',
    hint: 'In klaren Nächten lassen sich Sternbilder finden.',
    icon: 'icon_sparkle',
    bringt: ['sternbilder'],
  },
  {
    id: 'zuzug', ab: 55, boden: 0.45, inhalt: false,
    name: 'Der Zuzug',
    auftakt: 'Am Strand steht Gepäck. Jemand bleibt.',
    hint: 'Jemand zieht auf die Insel und wohnt von jetzt an hier.',
    icon: 'icon_house',
    bringt: ['nachbar'],
  },
  {
    /**
     * Das letzte Kapitel ist das einzige, das nach hinten offen ist.
     *
     * Die anderen vier bringen eine Sache dazu und sind damit fertig. Dieses
     * ändert, wie die Insel sich WIEDERHOLT: Der zweite Frühling ist nicht
     * derselbe wie der erste. Das ist der Grund, warum es keinen Nachfolger
     * braucht – ein sechstes Kapitel wäre entweder wieder eine neue Sache
     * (dann wächst das Spiel an seinem Rand) oder eine Wiederholung.
     */
    id: 'zweitesjahr', ab: 90, boden: 0.70, inhalt: false,
    name: 'Das zweite Jahr',
    auftakt: 'Die Insel kommt dir vor wie immer. Und doch ist etwas anders.',
    hint: 'Jede Jahreszeit bringt jetzt, was sie beim ersten Mal zurückgehalten hat.',
    icon: 'icon_star',
    bringt: ['wiederkehr'],
  },
];

export const KAPITEL_IDS = KAPITEL.map(function (k) { return k.id; });

/** Ein Kapitel nach Kennung – oder `null`. */
export function kapitelVon(id) {
  for (let i = 0; i < KAPITEL.length; i++) {
    if (KAPITEL[i].id === id) return KAPITEL[i];
  }
  return null;
}

/**
 * Ist dieses Kapitel an diesem Tag offen?
 *
 * Beide Bedingungen, und `tag` ist die, auf die es ankommt.
 */
export function offenAm(kap, tag, anteil) {
  if (!kap) return false;
  // Ein Kapitel ohne gebauten Inhalt geht nicht auf – siehe `inhalt` oben.
  if (!kap.inhalt) return false;
  return tag >= kap.ab && (anteil || 0) >= kap.boden;
}

/**
 * Alle Kapitel, die an diesem Tag offen sind – in der Reihenfolge der Liste.
 *
 * Nicht „das aktuelle": Es sind immer alle vorherigen mit dabei, das ist
 * Regel 2. Wer am sechzigsten Tag spielt, ist in vier Kapiteln gleichzeitig.
 */
export function offeneKapitel(tag, anteil) {
  return KAPITEL.filter(function (k) { return offenAm(k, tag, anteil); });
}

/**
 * Das jüngste offene Kapitel – das, in dem man gerade ist.
 *
 * Für den Titel im Tagebuch. Gibt immer eines heraus: Am ersten Tag ist das
 * „Ankunft", und einen Zustand ohne Kapitel gibt es nicht.
 */
export function jetzigesKapitel(tag, anteil) {
  const offen = offeneKapitel(tag, anteil);
  return offen.length ? offen[offen.length - 1] : KAPITEL[0];
}

/**
 * Das nächste Kapitel und was ihm noch fehlt.
 *
 * Gibt `tage` und `fehltAnteil` heraus, damit die Anzeige den EHRLICHEN Grund
 * nennen kann. Ein „bald ist es soweit" ohne Grund wäre eine Andeutung, und
 * Andeutungen ohne Deckung sind das, was ein Spiel beliebig macht.
 *
 * @returns {?object} {kapitel, tage, fehltAnteil} – oder null nach dem letzten
 */
export function naechstesKapitel(tag, anteil) {
  for (let i = 0; i < KAPITEL.length; i++) {
    const k = KAPITEL[i];
    // Ein Kapitel ohne Inhalt wird auch nicht angekündigt. Sonst stünde dort
    // für immer „Die niedrige See, in 0 Tagen" – eine Andeutung ohne
    // Deckung, und davor warnt der Absatz über dieser Funktion selbst.
    if (!k.inhalt) continue;
    if (offenAm(k, tag, anteil)) continue;
    return {
      kapitel: k,
      tage: Math.max(0, k.ab - tag),
      fehltAnteil: Math.max(0, k.boden - (anteil || 0)),
    };
  }
  return null;
}

/** Leerer Stand – wie `emptyWanderer` und `emptyFeste`. */
export function emptyKapitel() {
  return { offen: Object.create(null) };
}

/**
 * Welche Kapitel sind gerade eben aufgegangen?
 *
 * Verändert den Stand NICHT – das tut der Aufrufer, nachdem er die Meldung
 * gezeigt hat. Derselbe Schnitt wie bei `dueAt`: Eine Funktion, die prüft und
 * gleichzeitig einträgt, kann man nicht zweimal fragen, und genau das tut die
 * Schleife im Spiel.
 */
export function neueKapitel(stand, tag, anteil) {
  const offen = (stand && stand.offen) || Object.create(null);
  return offeneKapitel(tag, anteil).filter(function (k) { return !offen[k.id]; });
}

/** Steht dieses Kapitel im Spielstand? */
export function kapitelSteht(stand, id) {
  return !!(stand && stand.offen && stand.offen[id]);
}

/**
 * Gibt es diese Sache schon?
 *
 * Die Frage, die das Spiel wirklich stellt: nicht „welches Kapitel", sondern
 * „sind die Gezeiten schon da?". Über die Sache statt über die Kapitelnummer,
 * damit das Umsortieren der Liste keine abgefragte Stelle im Spiel bricht.
 */
export function kapitelHat(stand, sache) {
  if (!stand || !stand.offen) return false;
  for (let i = 0; i < KAPITEL.length; i++) {
    const k = KAPITEL[i];
    if (stand.offen[k.id] && k.bringt.indexOf(sache) >= 0) return true;
  }
  return false;
}

/** Alles, was die offenen Kapitel zusammen hergeben. */
export function sachenAus(stand) {
  const raus = [];
  for (let i = 0; i < KAPITEL.length; i++) {
    const k = KAPITEL[i];
    if (!(stand && stand.offen && stand.offen[k.id])) continue;
    for (let j = 0; j < k.bringt.length; j++) {
      if (raus.indexOf(k.bringt[j]) < 0) raus.push(k.bringt[j]);
    }
  }
  return raus;
}

/**
 * Wie weit der Bogen gelaufen ist – für die Anzeige.
 *
 * Bewusst „3 von 5" und kein Prozentwert: Prozente hat das Spiel schon, und
 * die Kapitel sind gerade die Achse, die KEIN Balken ist.
 */
export function kapitelStand(stand) {
  let n = 0;
  let gesamt = 0;
  for (let i = 0; i < KAPITEL.length; i++) {
    // Gezählt wird nur, was es gibt. Sonst stünde dort für immer „2 von 5"
    // und die fehlenden drei wären ein Versprechen in Zahlenform.
    if (!KAPITEL[i].inhalt) continue;
    gesamt++;
    if (stand && stand.offen && stand.offen[KAPITEL[i].id]) n++;
  }
  return { offen: n, gesamt: gesamt };
}
