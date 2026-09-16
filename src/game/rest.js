/**
 * Ausruhen – sich hinsetzen und nichts tun.
 *
 * Die Insel hatte Bänke, Stühle, eine Hängematte und eine Schaukel. Man
 * konnte sie bauen, aufstellen, wieder einpacken und daran vorbeigehen. Was
 * man nicht konnte: sich hineinsetzen. Damit war Sitzmöbel eine Kategorie im
 * Katalog und kein Ort.
 *
 * Das ist die Lücke, die dieses Modul schließt, und es tut dabei bewusst
 * nichts Nützliches: Sitzen bringt keine Münzen, keine Glut, keinen
 * Fortschritt. Es bringt drei Dinge, die ein gemütliches Spiel ausmachen –
 *
 *   1. eine **andere Haltung**: Seli sitzt sichtbar da, statt zu stehen,
 *   2. **Tiere, die näher kommen**, weil man sich nicht bewegt,
 *   3. einen **Gedanken zum Ort**, nach ein paar Sekunden, leise.
 *
 * Der dritte Punkt ist der eigentliche: Er sagt dem Spieler etwas über die
 * Stelle, an der er seine Bank hingestellt hat. Wer sie ans Wasser stellt,
 * bekommt andere Sätze als jemand, der sie in den Wald stellt – und das ist
 * die einzige Belohnung dafür, sich Gedanken über einen Platz zu machen, die
 * nicht in Zahlen ausgedrückt ist.
 *
 * Hier stehen nur Daten und die Auswahl. Wo Seli gerade sitzt, weiß das
 * Spiel; dieses Modul bekommt die fertige Lage gereicht und lässt sich
 * deshalb ohne Welt prüfen.
 */

/**
 * Wie hoch über dem Boden man auf welchem Möbel sitzt – in Bildpunkten.
 *
 * Nicht geschätzt, sondern an den fertigen Bildern nachgemessen (deckende
 * Punkte je Zeile, vom Fußpunkt aus gezählt). Die Sitzflächen liegen über
 * dem Fußpunkt des Möbels bei:
 *
 *   Bank        46   die breiteste Stelle, das Sitzbrett
 *   Stuhl       64   die Fläche zwischen Kante und Lehne
 *   Hängematte  60   die Mitte des durchhängenden Tuchs
 *   Schaukel   100   das Brett zwischen den Seilen
 *
 * Was hier steht, ist etwas anderes: wohin Selis FUSSPUNKT muss. Ihr
 * Rocksaum – die Stelle, mit der sie aufsitzt – liegt 25 Punkte darüber,
 * und das Spiel setzt sie zwei Punkte VOR das Möbel (siehe
 * `Player.setzDich`). Also: Sitzfläche − 25 + 2.
 *
 * Beim ersten Anlauf hatte die Schaukel 67 statt 77, und Seli saß zehn
 * Punkte im Brett. Auf dem Bildschirm sah das aus wie „sitzt halt da" – erst
 * die Messung hat es gezeigt. Wer die Zahlen ändert, messe nach.
 */
export const SITZ_HOEHE = {
  bench: 23, chair: 41, hammock: 37, swing: 77,
  // Nachgemessen wie die vier darüber: Der Hocker ist ein gekappter Stamm,
  // seine Platte liegt bei 54; die Steinbank trägt ihre Platte bei 44.
  stump: 31, stonebench: 21,
};

/** Die Sitzmöbel – dieselbe Gruppe, die die Wünsche „Platz zum Sitzen" nennt. */
export const SITZ_IDS = Object.keys(SITZ_HOEHE);

export function istSitzplatz(itemId) {
  return Object.prototype.hasOwnProperty.call(SITZ_HOEHE, itemId);
}

export function sitzHoehe(itemId) {
  return SITZ_HOEHE[itemId] || 0;
}

/**
 * Wie lange man die Taste halten muss, um das Möbel einzupacken.
 *
 * Sitzen und Einpacken liegen auf derselben Taste, weil beides dasselbe
 * meint: „mit diesem Stück etwas anfangen". Tippen ist das Häufige
 * (hinsetzen, aufstehen), Halten das Seltene (wieder mitnehmen). Andersherum
 * müsste man für jedes Ausruhen eine halbe Sekunde warten.
 */
export const HALTEN_SEK = 0.55;

/** Wann der erste Gedanke kommt – und wie oft danach einer nachkommt. */
export const ERSTER_GEDANKE = 4;
export const GEDANKE_ALLE = 9;

/**
 * Ab wann „abends" gilt – und bis wann „morgens".
 *
 * Stehen hier und nicht als Zahlen im Spielkern, damit ein Test nachsehen
 * kann, ob es diese Stunden überhaupt noch gibt: Der Tag läuft von 6 bis 2
 * Uhr nachts. Schöbe man den Abend hinter den Einbruch der Dunkelheit, gäbe
 * es die Abendsätze nie – und niemandem fiele es auf.
 *
 * Der Morgen ist kein Schönheitsfehler, sondern eine Reparatur: Das Spiel
 * fragt sonst `isDark()`, und das ist vor 6:48 Uhr ebenfalls wahr – fürs
 * LICHT völlig richtig, denn da dämmert es erst. Fürs REDEN nicht: Gemessen
 * in einer laufenden Sitzung sagte Seli um 06:14 Uhr „Die Sterne stehen
 * still". Die erste Dreiviertelstunde jedes Tages war Nacht.
 */
export const ABEND_AB = 17;
export const MORGEN_BIS = 9;

/** So viele zuletzt gesagte Sätze werden gemieden, bevor einer wiederkommt. */
export const GEDANKE_MERK = 8;

/**
 * Wie nah Falter, Motten und Vögel kommen, wenn man still sitzt.
 *
 * Sie kommen näher, aber nicht auf die Hand: `ZAHM_ABSTAND` ist der Kreis,
 * den sie um Seli herum lassen. Ohne ihn flögen sie in sie hinein und sähen
 * aus, als klebten sie an ihr.
 */
export const ZAHM_RADIUS = 300;
export const ZAHM_ABSTAND = 70;

/**
 * Wie stark eine Gruppe von Sätzen gegenüber den anderen gewichtet ist.
 *
 * Ohne Gewichte gewönne immer die größte Gruppe, und das wären die
 * allgemeinen Sätze – ausgerechnet die, die nichts über den Ort sagen. So
 * kommt zuerst das Besondere: der Geist neben der Bank, das Feuer daneben,
 * der Regen. Das Allgemeine füllt die Lücken.
 */
export const GEWICHT = {
  geist: 5,
  deko: 4,
  wetter: 4,
  moebel: 3,
  ort: 3,
  zeit: 2,
  jahreszeit: 2,
  immer: 1,
};

/**
 * Welche Deko welche Gruppe von Gedanken auslöst.
 *
 * Mehrere Stücke teilen sich eine Gruppe: Ob die Laterne, die Papierlampe
 * oder die Lichterkette neben der Bank steht, ändert nichts daran, dass es
 * Licht ist. Sieben Gruppen für vierzehn Stücke – Sätze, die man an jedem
 * einzelnen Stück wiedererkennt, wären fünfzehnmal derselbe Satz.
 */
export const DEKO_GEDANKE = {
  firebowl: 'feuer',
  lantern: 'licht', moonlamp: 'licht', paperlamp: 'licht', stringlights: 'licht',
  // Die Reiselaterne bekommt als EINZIGE eine eigene Gruppe, obwohl die Regel
  // darüber gegen Gruppen für ein einziges Stück spricht. Der Grund: Sie ist
  // der einzige Gegenstand im Spiel, der von jemandem kommt, der nicht von
  // hier ist. „Es ist Licht" wäre bei ihr das Falscheste, was man denken
  // könnte.
  travellamp: 'ferne',
  pond: 'stillwasser', birdbath: 'stillwasser',
  birdhouse: 'voegel', beehive: 'bienen',
  flowerbed: 'blumen', planter: 'blumen', trellis: 'blumen',
  windchime: 'windspiel',
  table: 'gedeckt', mat: 'gedeckt', rug: 'gedeckt',
  // Becken und Kasten teilen sich eine Gruppe: Was darin ist, unterscheidet
  // sich, aber das Danebensitzen und Zusehen ist dasselbe.
  aquarium: 'schaukasten', buttercase: 'schaukasten',
};

/**
 * Die Sätze.
 *
 * Kurz, im Präsens, ohne Pointe. Ein Gedanke beim Sitzen ist eine
 * Beobachtung, kein Witz und keine Aufgabe – nichts hier verweist auf etwas,
 * das man tun sollte. Wer einen Satz dazuschreibt, prüfe ihn an dieser
 * Regel; ein „Du solltest mal …" hätte hier nichts verloren.
 */
export const GEDANKEN = {
  /* --- Möbel --- */
  bench: [
    'Die Bank ist da noch warm, wo vorhin die Sonne stand.',
    'Von hier aus sieht man Sachen, an denen man sonst vorbeiläuft.',
    'Zwei Plätze. Einer reicht ja eigentlich.',
  ],
  chair: [
    'Ein Stuhl, mitten in der Landschaft. Warum eigentlich nicht.',
    'Die Lehne knarrt einmal und dann nie wieder.',
    'Die vorderen Beine stehen ein bisschen schief. Passt schon.',
  ],
  hammock: [
    'Man liegt schief. Es stört überhaupt nicht.',
    'Das Tuch wiegt noch nach, lange nachdem man aufgehört hat.',
    'Von unten sehen die Äste anders aus als von vorn.',
  ],
  swing: [
    'Auch ohne Anstoß dreht sich die Schaukel langsam weiter.',
    'Die Seile knirschen leise. Das gehört dazu.',
    'Die Füße kommen nicht runter. Das ist das Schöne daran.',
  ],
  stump: [
    'Der Baum stand länger hier als ich. Jetzt sitze ich auf ihm.',
    'Ich habe die Ringe gezählt und mich zweimal verzählt.',
  ],
  stonebench: [
    'Der Stein wird nicht warm. Auch nach einer Weile nicht.',
    'Die hält noch, wenn hier längst niemand mehr sitzt.',
  ],

  /* --- Wer daneben steht --- */
  geist: [
    'Wir sagen gerade beide nichts. Ist auch gut so.',
    'Von hier aus wirkt er ganz ruhig.',
    'Man muss nicht immer etwas zu besprechen haben.',
  ],

  /* --- Was daneben steht --- */
  feuer: [
    'Das Feuer macht das gleiche Geräusch wie zu Hause.',
    'Die Wärme kommt in Wellen. Immer knapp bevor man friert.',
  ],
  licht: [
    'Das Licht reicht genau bis hierher. Weiter braucht es nicht.',
    'Um die Lampe herum ist alles ein bisschen freundlicher.',
  ],
  ferne: [
    'Die war weiter herum als ich. Jetzt steht sie hier.',
    'Irgendwo brennt gerade eine genau so. Nur woanders.',
  ],
  stillwasser: [
    'Auf dem Wasser steht das ganze Bild noch einmal, nur wackeliger.',
    'Etwas hat sich bewegt. Jetzt ist es wieder glatt.',
  ],
  voegel: [
    'Sie warten, bis ich lange genug still bin.',
    'Einer sitzt oben und schimpft. Vermutlich über mich.',
  ],
  bienen: [
    'Der Ton bleibt gleich, egal wie viele es sind.',
    'Sie fliegen los, kommen zurück, fliegen los. Ein guter Plan.',
  ],
  blumen: [
    'Die haben sich seit gestern kein Stück bewegt und trotzdem verändert.',
    'Von hier riecht man sie erst richtig.',
  ],
  windspiel: [
    'Das Windspiel geht immer einen Moment nach dem Wind.',
    'Drei Töne, und nie in derselben Reihenfolge.',
  ],
  gedeckt: [
    'Ein Tisch draußen ist einfach etwas anderes.',
    'Es ist alles da. Man muss nur sitzen bleiben.',
  ],
  schaukasten: [
    'Der Kleinste war der schwerste Fang. Man sieht es ihm nicht an.',
    'Sie ziehen ihre Runden. Ich auch, nur langsamer.',
  ],

  /* --- Wetter --- */
  regen: [
    'Regen auf dem Hut ist ein ausgesprochen guter Klang.',
    'Alles wird dunkler und die Farben werden kräftiger. Merkwürdig.',
    'Nass werde ich sowieso. Dann kann ich auch sitzen bleiben.',
  ],
  nebel: [
    'Die Insel hört zwanzig Schritte weiter auf und fängt später wieder an.',
    'Im Nebel klingt alles, als käme es von woanders.',
  ],
  schnee: [
    'Der Schnee macht keinen Lärm. Deshalb hört man den Rest so gut.',
    'Auf den Ärmeln bleibt er ein paar Sekunden liegen und ist dann Wasser.',
  ],

  /* --- Tageszeit --- */
  nacht: [
    'Nachts ist die Insel kleiner. Sie hört da auf, wo man noch sieht.',
    'Die Sterne stehen still und man selbst auch. Ganz kurz passt das.',
    'Irgendwo ruft etwas. Es ruft jede Nacht.',
  ],
  abend: [
    'Das Licht wird gerade tiefer und tut niemandem mehr weh.',
    'Noch ein bisschen bleiben. Der Weg zurück ist ja nicht weit.',
  ],
  morgen: [
    'Es ist noch niemand wach. Die Insel gehört gerade mir.',
    'Der Tau liegt noch auf allem. In einer Stunde ist er weg.',
    'So früh riecht es anders. Kühler irgendwie.',
  ],

  /* --- Ort --- */
  wasser: [
    'Das Wasser macht immer dasselbe Geräusch und nie ganz genau.',
    'Da draußen ist eine Linie, und dahinter weiß ich nichts.',
    'Die Wellen kommen unterschiedlich weit. Ich zähle nicht mit.',
  ],
  wald: [
    'Zwischen den Stämmen bewegt sich Licht, obwohl kein Wind geht.',
    'Es knackt. Es knackt immer irgendwo, und es ist nie etwas.',
    'Hier riecht es nach Holz und ein bisschen nach Regen von vorgestern.',
  ],
  klippen: [
    'Von hier oben ist die ganze Insel eine überschaubare Angelegenheit.',
    'Der Wind ist hier oben ehrlicher.',
  ],
  insel: [
    'Drüben ist es stiller. Man merkt erst hier, wie laut das andere war.',
    'Das Wasser dazwischen hat gereicht, um alles anders zu machen.',
  ],
  lager: [
    'Das Feuer brennt, die Kiste steht da, es ist alles an seinem Platz.',
    'Von hier aus habe ich angefangen. Das war noch nicht lange her.',
  ],
  zuhause: [
    'Das habe ich gebaut. Von hier sieht man das ganz gut.',
    'Es ist genau so groß, wie es sein muss.',
  ],
  abseits: [
    'Hier kommt niemand vorbei. Genau darum sitze ich hier.',
    'Man hört sich selbst atmen. Sonst nichts.',
  ],
  /**
   * Drinnen.
   *
   * Eigene Gruppe, nicht `zuhause`: Die Sätze dort handeln davon, das eigene
   * Haus von AUSSEN zu sehen („Von hier sieht man das ganz gut"). Drinnen zu
   * sitzen ist etwas anderes, und es ist der einzige Ort im Spiel, an dem
   * niemand etwas von ihr will.
   */
  drinnen: [
    'Draußen ist noch einiges zu tun. Draußen.',
    'Hier drin muss gar nichts fertig werden.',
    'Alles steht da, wo ich es hingestellt habe.',
    'Ich höre die Insel von hier aus kaum. Angenehm.',
    'Das ist mein Stuhl, mein Boden, meine Wand.',
    'Ein Zimmer wird erst durch das Sitzen darin eines.',
  ],

  /* --- Jahreszeit --- */
  spring: [
    'Alles ist noch ein bisschen hell und ungeübt.',
    'Es wächst so schnell, dass man beim Zusehen ungeduldig wird.',
  ],
  summer: [
    'Die Luft steht. Bewegen wäre jetzt eine schlechte Idee.',
    'Nach der Wärme kommt abends immer dieser eine kühle Zug.',
  ],
  autumn: [
    'Es fällt dauernd irgendwo etwas herunter, und nichts davon ist wichtig.',
    'Die Farben sind laut geworden, kurz bevor sie leiser werden.',
  ],
  winter: [
    'Kalte Finger, warmer Rest. Damit lässt sich arbeiten.',
    'Der Boden ist hart und jeder Schritt hört sich weiter weg an.',
  ],

  /* --- Immer möglich --- */
  immer: [
    'Nichts zu tun ist auch etwas.',
    'Ich sollte das öfter machen.',
    'Da drüben wäre auch noch ein guter Platz für eine Bank.',
    'Es riecht nach nichts Bestimmtem, und das ist angenehm.',
    'Gleich stehe ich auf. Gleich.',
  ],
};

/**
 * Welche Gruppen zu einer Lage passen, mitsamt Gewicht.
 *
 * `lage` ist ein schlichtes Objekt und kommt aus dem Spiel:
 *
 *   { moebel, geist, deko: [itemId], wetter, nacht, abend, orte: [ortId],
 *     jahreszeit }
 *
 * Unbekannte Namen werden übergangen statt zu stören: Ein Ort ohne eigene
 * Sätze fällt einfach weg, und die Auswahl greift auf das Allgemeine zurück.
 */
export function gruppenFuer(lage) {
  const l = lage || {};
  const raus = [];
  const dazu = function (id, gewicht) {
    if (!id || !GEDANKEN[id] || !GEDANKEN[id].length) return;
    for (let i = 0; i < raus.length; i++) if (raus[i].id === id) return;
    raus.push({ id: id, gewicht: gewicht });
  };

  dazu(l.moebel, GEWICHT.moebel);
  if (l.geist) dazu('geist', GEWICHT.geist);

  const deko = l.deko || [];
  for (let i = 0; i < deko.length; i++) dazu(DEKO_GEDANKE[deko[i]], GEWICHT.deko);

  dazu(l.wetter, GEWICHT.wetter);
  // Genau eine Tageszeit, in dieser Reihenfolge. Morgens ist es zwar auch
  // dunkel, aber es ist eben Morgen und nicht Nacht.
  if (l.morgen) dazu('morgen', GEWICHT.zeit);
  else if (l.nacht) dazu('nacht', GEWICHT.zeit);
  else if (l.abend) dazu('abend', GEWICHT.zeit);

  const orte = l.orte || [];
  for (let i = 0; i < orte.length; i++) dazu(orte[i], GEWICHT.ort);

  dazu(l.jahreszeit, GEWICHT.jahreszeit);
  dazu('immer', GEWICHT.immer);
  return raus;
}

/**
 * Ein Gedanke zur Lage – nie leer, nie zweimal kurz hintereinander.
 *
 * Erst wird die Gruppe gewichtet gezogen, dann der Satz darin. Zuletzt
 * Gesagtes wird übersprungen, solange in der Gruppe noch etwas anderes
 * steht; ist alles verbraucht, kommt lieber eine Wiederholung als gar nichts.
 *
 * @param {object}   lage
 * @param {string[]} letzte  zuletzt gesagte Sätze, neueste zuerst
 * @param {Function} rnd     Zufall in [0,1)
 */
export function waehleGedanke(lage, letzte, rnd) {
  const zufall = rnd || Math.random;
  const gruppen = gruppenFuer(lage);
  if (!gruppen.length) return '';
  const gemieden = letzte || [];

  // Gruppen, in denen noch etwas Ungesagtes steht, haben Vorrang. Ohne das
  // zöge es immer wieder die eine kleine Gruppe, deren zwei Sätze man
  // gerade gehört hat.
  const frisch = gruppen.filter(function (g) {
    return GEDANKEN[g.id].some(function (s) { return gemieden.indexOf(s) < 0; });
  });
  const wahl = frisch.length ? frisch : gruppen;

  let summe = 0;
  for (let i = 0; i < wahl.length; i++) summe += wahl[i].gewicht;
  let wurf = zufall() * summe;
  let gruppe = wahl[wahl.length - 1];
  for (let i = 0; i < wahl.length; i++) {
    wurf -= wahl[i].gewicht;
    if (wurf < 0) { gruppe = wahl[i]; break; }
  }

  const alle = GEDANKEN[gruppe.id];
  const offen = alle.filter(function (s) { return gemieden.indexOf(s) < 0; });
  const topf = offen.length ? offen : ohneLetzten(alle, gemieden);
  return topf[Math.floor(zufall() * topf.length) % topf.length];
}

/**
 * Ist alles gesagt, kommt lieber eine Wiederholung als Schweigen – aber
 * niemals derselbe Satz zweimal hintereinander.
 *
 * Ohne diese Zeile hing die Regel an der Größe des Vorrats: Bei einer Lage
 * mit vielen Gruppen ist immer etwas Ungesagtes da, bei einer mageren nicht.
 * Gemessen im laufenden Spiel: bei dreißig Zügen eine unmittelbare
 * Wiederholung – und im Unit-Test keine, weil der eine reiche Lage benutzte.
 * Das ist genau die Sorte Fehler, die eine Prüfung mit zu bequemen Daten
 * durchwinkt.
 */
function ohneLetzten(alle, gemieden) {
  const zuletzt = gemieden && gemieden.length ? gemieden[0] : null;
  if (!zuletzt || alle.length < 2) return alle;
  const rest = alle.filter(function (s) { return s !== zuletzt; });
  return rest.length ? rest : alle;
}


/** Den Satz vormerken, damit er so bald nicht wiederkommt. */
export function merkeGedanke(letzte, satz) {
  const liste = [satz].concat((letzte || []).filter(function (s) { return s !== satz; }));
  return liste.slice(0, GEDANKE_MERK);
}
