/**
 * Die Bewohner – vier, die nach und nach herziehen und bleiben.
 *
 * Jule war der Beweis, dass die Besetzung dieser Insel nicht endgültig ist
 * (siehe `nachbar.js`). Sie blieb aber eine Einzelne. Das hier ist der
 * Schritt danach, und es ist der stärkste Dauermotor, den Animal Crossing
 * hat: **Es kommt noch jemand.** Eine Welt, deren Bewohnerschaft von Anfang
 * an vollzählig ist, hat man nach einem halben Jahr besichtigt. Eine, bei
 * der nach dem hundertsten Tag noch jemand einzieht, nicht.
 *
 * **Woher sie kommen.** Nicht aus dem Nichts, sondern weil die Insel wieder
 * bewohnbar aussieht: Jeder Zuzug hat eine Mindestzahl an Tagen UND eine
 * Mindestfarbe. Das verknüpft den neuen Inhalt mit dem alten Kern, statt
 * ihn danebenzustellen – wer Farbe zurückbringt, bekommt Nachbarn.
 *
 * **Was sie von den Geistern unterscheidet.** Dieselben vier Regeln wie bei
 * Jule, und sie sind der Grund, warum das hier kein achter Auftraggeber
 * wird:
 *
 * 1. **Sie leben.** Keine Freundschaftsstufe, die man „füllt", keine
 *    Erinnerungskette, kein Farbkreis. Sie sind einfach da.
 * 2. **Sie stellen keine Aufgabe.** Nichts von ihnen landet im
 *    Aufgabenbuch. Wer nie mit ihnen redet, verpasst nichts, was verfällt.
 * 3. **Sie geben, statt zu fordern.** Jeden Morgen liegt etwas Kleines vor
 *    ihrer Tür. Die Geister bitten um Holz und Harz, der Wanderer tauscht –
 *    ein vierter Kanal, der etwas will, wäre einer zu viel.
 * 4. **Einmal am Tag.** Wer jemanden zehnmal hintereinander anspricht, hat
 *    nicht zehnmal geredet.
 *
 * **Und was sie von Jule unterscheidet:** Jule fragt nach dem, was man
 * gesehen hat, und schreibt es auf. Die vier hier reden übers Wetter, über
 * ihre Arbeit und über die anderen. Das ist Absicht – Jules Buch bleibt
 * ihres, sonst wäre sie eine von vieren statt die Erste, die blieb.
 *
 * Alles hier ist reine Rechnung auf übergebenen Werten: kein Browser, keine
 * Wartezeit, prüfbar.
 */

/**
 * Die vier.
 *
 * `look` geht unverändert an den Geistermaler – mit `lebt: true` malt er
 * dieselbe Kreatur mit Füßen statt Schimmer. Deshalb sehen Bewohner und
 * Geister aus wie aus einer Familie, und genau so soll es sein.
 *
 * `ab` ist die Bedingung: so viele Tage auf der Insel UND so viel Farbe
 * zurück. Die Abstände sind mit Absicht groß – der Letzte kommt erst im
 * zweiten Spieljahr, und bis dahin steht immer noch jemand aus.
 */
export const BEWOHNER = [
  {
    id: 'hilde',
    name: 'Hilde',
    was: 'Sie gärtnert, seit sie denken kann.',
    ab: { tag: 14, deckung: 0.15 },
    look: {
      lebt: true, ears: 'round', hat: 'cap',
      fur: '#b9b2a4', furShade: '#938c7e', accent: '#7d9465',
    },
    hutte: { wand: '#dcd0b4', dach: '#7f8f63', tuer: '#6b5536' },
    tuergabe: ['seed_flower', 'seed_herb', 'herb', 'flower_pink'],
    saetze: [
      'Der Boden hier ist besser, als er aussieht. Man muss ihn nur fragen.',
      'Ich habe heute nichts geschafft. War auch mal schön.',
      'Wenn du Samen übrig hast: Wirf sie nicht weg. Wirf sie hin.',
      'Im Winter wächst auch etwas. Nur langsamer, und du siehst es nicht.',
      'Mira war da. Sie hat nichts gesagt und alles begossen.',
      'Zwei Dinge dauern, egal wie sehr man sich anstrengt: Bäume und Freundschaften.',
      'Ich habe früher in einer Stadt gewohnt. Da war der Boden unter Steinen.',
      'Das Beste am Gärtnern ist das Warten. Das sagt dir aber niemand vorher.',
    ],
  },
  {
    id: 'pepe',
    name: 'Pepe',
    was: 'Baut dauernd etwas und meistens zweimal.',
    ab: { tag: 34, deckung: 0.3 },
    look: {
      lebt: true, ears: 'long', hat: 'scarf',
      fur: '#e0cba6', furShade: '#b7a07c', accent: '#c4705a',
    },
    hutte: { wand: '#e6d3a8', dach: '#a2704a', tuer: '#7c5a38' },
    tuergabe: ['wood', 'hardwood', 'resin', 'fiber'],
    saetze: [
      'Ich habe das Regal dreimal gebaut. Das dritte steht.',
      'Tobi und ich haben gemessen. Wir kamen auf zwei verschiedene Zahlen.',
      'Krumm ist nicht falsch. Krumm ist nur krumm.',
      'Ich wollte heute früh anfangen. Dann war es schon Mittag.',
      'Hast du mal probiert, einfach nichts zu bauen? Ich nicht.',
      'Wenn du Hartholz findest – ich frage nicht danach. Ich sage nur, dass es gut ist.',
      'Mein erstes Haus hatte kein Dach. Das war im Sommer egal.',
      'Ich mag den Geruch von frischem Holz mehr als das, was daraus wird.',
    ],
  },
  {
    id: 'marei',
    name: 'Marei',
    was: 'Singt beim Kochen und kocht viel.',
    ab: { tag: 70, deckung: 0.5 },
    look: {
      lebt: true, ears: 'pointed', hat: 'flowers',
      fur: '#f2ece0', furShade: '#c9c0b0', accent: '#d68aa0',
    },
    hutte: { wand: '#f0e4cc', dach: '#b4687a', tuer: '#8a5f42' },
    tuergabe: ['dish_berrymash', 'dish_herbtea', 'berry', 'mushroom'],
    saetze: [
      'Es steht etwas auf dem Feuer. Frag nicht was, ich weiß es selbst nicht.',
      'Ich singe nicht gut. Ich singe nur gern.',
      'Nelly hat mir ein Rezept gegeben. Es war ein Satz lang.',
      'Zu viel Salz kann man nicht zurücknehmen. Alles andere schon.',
      'Riech mal. Nein, warte, jetzt ist es weg.',
      'Ich koche am liebsten für zwei. Auch wenn nur ich esse.',
      'Auf dem Festland habe ich für sechzig Leute gekocht. Hier für sechs. Hier ist es besser.',
      'Wenn etwas anbrennt, nenn es geröstet.',
    ],
  },
  {
    id: 'knut',
    name: 'Knut',
    was: 'Sitzt am Wasser und redet wenig.',
    ab: { tag: 130, deckung: 0.72 },
    look: {
      lebt: true, ears: 'round', hat: 'scarf',
      fur: '#9a7b5e', furShade: '#776046', accent: '#5f7f96',
    },
    hutte: { wand: '#cfc0a2', dach: '#5f7f96', tuer: '#6b5536' },
    tuergabe: ['fish_sardine', 'fish_roach', 'shell', 'driftwood'],
    saetze: [
      'Hm.',
      'Heute beißt nichts. Ist auch eine Antwort.',
      'Käpt’n Kiesel erzählt die Geschichte falsch. Ich sage aber nichts.',
      'Ich bin wegen der Ruhe hergekommen. Die gibt es hier wirklich.',
      'Du läufst viel. Setz dich mal hin.',
      'Das Wasser sieht jeden Tag gleich aus und ist jeden Tag anders.',
      'Früher wollte ich weiter raus. Jetzt reicht mir das Ufer.',
      'Wenn du einen Fisch brauchst, sag Bescheid. Oder sag nichts, dann liegt morgen einer da.',
    ],
  },
];

export const BEWOHNER_IDS = BEWOHNER.map(function (b) { return b.id; });

/** Einen Bewohner zur Kennung – oder null. */
export function bewohnerFuer(id) {
  for (let i = 0; i < BEWOHNER.length; i++) if (BEWOHNER[i].id === id) return BEWOHNER[i];
  return null;
}

/** Leerer Stand. */
export function emptyBewohner() {
  return { da: {}, geredet: {}, satz: {}, gabe: {} };
}

/**
 * Einen gespeicherten Stand einlesen und säubern.
 *
 * Unbekannte Kennungen fliegen raus: Hieße ein Bewohner einmal anders,
 * bliebe sonst eine Leiche im Spielstand, die nie wieder jemand anspricht.
 */
export function bewohnerAus(roh) {
  const stand = emptyBewohner();
  if (!roh || typeof roh !== 'object') return stand;
  for (const id of BEWOHNER_IDS) {
    if (roh.da && roh.da[id] > 0) stand.da[id] = Math.floor(roh.da[id]);
    if (roh.geredet && roh.geredet[id] > 0) stand.geredet[id] = Math.floor(roh.geredet[id]);
    if (roh.satz && Array.isArray(roh.satz[id])) {
      const b = bewohnerFuer(id);
      stand.satz[id] = roh.satz[id]
        .map(function (n) { return Math.floor(Number(n)); })
        .filter(function (n, i, a) {
          return n >= 0 && n < b.saetze.length && a.indexOf(n) === i;
        });
    }
    if (roh.gabe && roh.gabe[id] > 0) stand.gabe[id] = Math.floor(roh.gabe[id]);
  }
  return stand;
}

/** Wohnt dieser Bewohner schon hier? */
export function wohntHier(stand, id) {
  return !!(stand && stand.da && stand.da[id] > 0);
}

/** Alle, die schon hier wohnen. */
export function alleDa(stand) {
  return BEWOHNER.filter(function (b) { return wohntHier(stand, b.id); });
}

/**
 * Wer als Nächster einziehen würde – oder null.
 *
 * Immer nur EINER unterwegs. Zwei Zuzüge am selben Tag wären kein Ereignis
 * mehr, sondern eine Lieferung, und die Reihenfolge der vier ist erzählt:
 * erst die Gärtnerin, zuletzt der, der am Wasser sitzt.
 */
export function naechsterZuzug(stand, tag, deckung) {
  if (zogHeuteEin(stand, tag)) return null;
  for (let i = 0; i < BEWOHNER.length; i++) {
    const b = BEWOHNER[i];
    if (wohntHier(stand, b.id)) continue;
    if (tag < b.ab.tag) return null;
    if (deckung < b.ab.deckung) return null;
    return b;
  }
  return null;
}

/**
 * Woran es beim Nächsten noch hakt – für die Chronik.
 *
 * Ehrlich und konkret statt „bald": Wer liest, dass noch 40 Tage und 12
 * Prozent Farbe fehlen, weiß, woran er ist. „Bald" weiß das nicht.
 */
export function zuzugGrund(stand, tag, deckung) {
  for (let i = 0; i < BEWOHNER.length; i++) {
    const b = BEWOHNER[i];
    if (wohntHier(stand, b.id)) continue;
    const teile = [];
    if (tag < b.ab.tag) teile.push((b.ab.tag - tag) + ' Tage');
    const fehlt = Math.round((b.ab.deckung - deckung) * 100);
    if (fehlt > 0) teile.push(fehlt + ' % Farbe');
    if (!teile.length) return { bewohner: b, text: 'zieht morgen ein' };
    return { bewohner: b, text: 'noch ' + teile.join(' und ') };
  }
  return null;
}

/**
 * Ist heute schon jemand eingezogen?
 *
 * Die Regel „höchstens einer am Tag" stand zuerst nur im Kommentar, und die
 * Prüfung hat das gefunden: Zweimal nacheinander gefragt, und es zogen zwei
 * ein. Im Spiel wäre das nicht aufgefallen, weil der Tageswechsel nur einmal
 * fragt – aber eine Regel, die davon abhängt, dass der Aufrufer sich benimmt,
 * ist keine Regel.
 */
export function zogHeuteEin(stand, tag) {
  if (!stand || !stand.da) return false;
  for (const id in stand.da) if (stand.da[id] === tag) return true;
  return false;
}

/** Jemanden einziehen lassen. */
export function einziehen(stand, id, tag) {
  if (!bewohnerFuer(id) || wohntHier(stand, id)) return false;
  stand.da[id] = tag;
  return true;
}

/**
 * Der Satz von heute – und keiner zweimal, bis alle durch sind.
 *
 * Dieselbe Regel wie beim Geplauder der Geister. Ein Bewohner, der jeden
 * Tag würfelt, sagt denselben Satz in einer Woche dreimal, und das merkt
 * man sofort.
 */
export function naechsterSatz(stand, id) {
  const b = bewohnerFuer(id);
  if (!b) return null;
  let gesagt = (stand.satz && stand.satz[id]) || [];
  if (gesagt.length >= b.saetze.length) gesagt = [];
  for (let i = 0; i < b.saetze.length; i++) {
    if (gesagt.indexOf(i) < 0) return { nummer: i, text: b.saetze[i] };
  }
  return { nummer: 0, text: b.saetze[0] };
}

/** Merkt, dass heute geredet wurde. Gibt zurück, ob es das erste Mal heute war. */
export function merkeRede(stand, id, nummer, tag) {
  if (stand.geredet[id] === tag) return false;
  stand.geredet[id] = tag;
  if (!Array.isArray(stand.satz[id])) stand.satz[id] = [];
  const b = bewohnerFuer(id);
  if (b && stand.satz[id].length >= b.saetze.length) stand.satz[id] = [];
  if (stand.satz[id].indexOf(nummer) < 0) stand.satz[id].push(nummer);
  return true;
}

/** Wurde heute schon geredet? */
export function heuteGeredet(stand, id, tag) {
  return stand.geredet[id] === tag;
}

/**
 * Was heute vor der Tür liegt – oder null, wenn es heute schon abgeholt ist.
 *
 * Die Gabe hängt am Tag und an der Kennung, nicht am Zufall des Augenblicks:
 * Wer neu lädt, findet dasselbe vor. Und sie wird nicht angekündigt – man
 * findet sie, oder man findet sie eben nicht.
 */
export function tuergabeFuer(id, tag) {
  const b = bewohnerFuer(id);
  if (!b) return null;
  const n = ((tag * 2654435761) >>> 0) % b.tuergabe.length;
  return b.tuergabe[n];
}

/** Schon abgeholt? */
export function gabeGeholt(stand, id, tag) {
  return stand.gabe[id] === tag;
}

/** Abholen vermerken. */
export function merkeGabe(stand, id, tag) {
  if (stand.gabe[id] === tag) return false;
  stand.gabe[id] = tag;
  return true;
}

/** Wie viele Tage man mit jemandem geredet hat – grob, für die Chronik. */
export function bewohnerStand(stand) {
  return {
    da: alleDa(stand).length,
    alle: BEWOHNER.length,
  };
}
