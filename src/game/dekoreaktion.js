/**
 * Was die Geister zu deinen Sachen sagen.
 *
 * Von den Brunnen, die ein Spiel lange tragen, ist genau einer unbegrenzt:
 * was der Spieler selbst macht. Die Insel hat 58 Deko-Stücke und ein
 * Innenleben, man kann also sehr lange einrichten – nur hat es bis hierher
 * **niemand bemerkt**. Man stellte eine Bank neben Bruno, und Bruno sagte
 * weiter dasselbe wie vorher.
 *
 * Das ist die fehlende Hälfte, und sie ist die wichtigere. Einrichten ohne
 * Reaktion ist Dekorieren; Einrichten mit Reaktion ist ein Gespräch. Die
 * Gemütlichkeit (`syncCosiness`) rechnet schon nach, was in der Nähe steht,
 * aber sie zahlt es in Farbe aus – und Farbe ist eine Zahl, kein Satz.
 *
 * **Vier Regeln.**
 *
 * 1. **Das konkrete Stück, nicht die Stimmung.** „Schön hast du es hier"
 *    wäre schlimmer als gar nichts: Es behauptet Aufmerksamkeit, die nicht
 *    da ist. Gesagt wird, was dort steht.
 * 2. **Einmal je Geist und Sache.** Wer das Windspiel kommentiert, tut es
 *    einmal. Beim vierten Mal ist aus der Beobachtung ein Spruchband
 *    geworden.
 * 3. **Keine Wertung und keine Bitte.** Kein „schöner wäre", kein „stell
 *    mir doch". Sonst wird das Einrichten eine Aufgabenliste, die die
 *    Geister schreiben – und damit genau nicht mehr das, was dem Spieler
 *    gehört.
 * 4. **Wer dazu etwas Eigenes zu sagen hat, sagt es.** Käpt'n Kiesel zum
 *    stillen Wasser, Nelly zur Wäscheleine: Diese Paarungen sind der
 *    eigentliche Gewinn. Alle anderen bekommen den allgemeinen Satz, und
 *    das ist in Ordnung – sieben mal achtzehn eigene Sätze wären 126
 *    Zeilen, von denen hundert nach Füllung klängen.
 */

/**
 * Welches Deko-Stück zu welcher Sache gehört.
 *
 * Gruppen statt einzelner Stücke, aus demselben Grund wie bei
 * `DEKO_GEDANKE` in `rest.js`: Für vier Laternen braucht es nicht vier
 * Sätze über Licht. Was hier NICHT auftaucht, wird nicht kommentiert – und
 * das ist Absicht: Ein Geist, der zu jedem Zaunpfahl etwas sagt, sagt zu
 * nichts mehr etwas.
 */
export const GRUPPE = {
  firebowl: 'feuer', torch: 'feuer',
  lantern: 'licht', moonlamp: 'licht', paperlamp: 'licht',
  stringlights: 'licht', stonelamp: 'licht',
  travellamp: 'ferne',
  pond: 'stillwasser', birdbath: 'stillwasser',
  birdhouse: 'voegel', feeder: 'voegel',
  beehive: 'bienen',
  flowerbed: 'blumen', planter: 'blumen', trellis: 'blumen',
  flowerbox: 'blumen', bonsai: 'blumen', hangplant: 'blumen',
  windchime: 'windspiel', weathervane: 'windspiel',
  table: 'gedeckt', mat: 'gedeckt', rug: 'gedeckt', bowl: 'gedeckt',
  aquarium: 'schaukasten', buttercase: 'schaukasten',
  bench: 'sitzen', chair: 'sitzen', hammock: 'sitzen', swing: 'sitzen',
  stonebench: 'sitzen', stump: 'sitzen',
  path_tile: 'weg', steppingstones: 'weg', bridge_kit: 'weg', arch: 'weg',
  bookstack: 'buecher', shelf: 'buecher',
  picture: 'bilder', islandpic: 'bilder',
  wreath: 'kranz', wreath_spring: 'kranz', wreath_summer: 'kranz',
  wreath_autumn: 'kranz', wreath_winter: 'kranz',
  hedgehogbox: 'tiere', scarecrow: 'tiere',
  clothesline: 'waesche',
  signpost: 'schild',
  fence: 'zaun',
  keepsake_locket: 'andenken', keepsake_ribbon: 'andenken',
  keepsake_compass: 'andenken', keepsake_photo: 'andenken',
  keepsake_music: 'andenken', keepsake_teacup: 'andenken',
  keepsake_shellchain: 'andenken',
};

/**
 * Der allgemeine Satz je Sache.
 *
 * Im Präsens, ohne Pointe, ohne Wertung – derselbe Ton wie Selis Gedanken
 * beim Ausruhen. Einer je Gruppe und nicht drei: Ein zweiter Satz würde nie
 * gehört, weil jeder Geist jede Sache nur einmal kommentiert.
 */
export const ALLGEMEIN = {
  feuer: 'Du hast Feuer hergestellt. Das wärmt bis hier herüber.',
  licht: 'Es ist heller geworden an dieser Stelle.',
  ferne: 'Die Laterne da war schon woanders. Man sieht es ihr an.',
  stillwasser: 'Stilles Wasser. Darin steht der Himmel still.',
  voegel: 'Seit das da steht, ist hier mehr los.',
  bienen: 'Die summen den ganzen Tag. Ich höre gern zu.',
  blumen: 'Das wächst jetzt hier. Das hat vorher nicht hier gewachsen.',
  windspiel: 'Jetzt höre ich den Wind, statt ihn nur zu spüren.',
  gedeckt: 'Das sieht aus, als würde gleich jemand kommen.',
  schaukasten: 'Du zeigst, was du gefunden hast. Das gefällt mir.',
  sitzen: 'Da kann man sitzen. Das ist mehr wert, als es aussieht.',
  weg: 'Jemand hat sich überlegt, wo man langgeht.',
  buecher: 'Bücher. Die haben lange niemanden mehr gesehen.',
  bilder: 'Du hängst auf, was du gesehen hast. Das machen wenige.',
  kranz: 'Ein Kranz. Also ist gerade etwas.',
  tiere: 'Du hast an die gedacht, die nicht fragen können.',
  waesche: 'Wäsche im Wind. Das riecht nach jemandem, der bleibt.',
  schild: 'Jetzt hat die Stelle einen Namen. Vorher war sie nur hier.',
  zaun: 'Ein Zaun sagt: bis hierher. Manchmal braucht man das.',
  andenken: 'Das gehörte einem von uns. Dass es dasteht, ist schön.',
};

/**
 * Was ein bestimmter Geist zu einer bestimmten Sache sagt.
 *
 * Nur dort, wo die Paarung wirklich etwas hergibt – sie sind der Gewinn
 * dieser ganzen Datei. Alles ohne Eintrag fällt auf `ALLGEMEIN` zurück.
 */
export const EIGEN = {
  flamey: {
    feuer: 'Du machst Feuer. Ich BIN Feuer. Wir verstehen uns.',
    licht: 'Licht, das bleibt. Ich gehe ja immer wieder aus.',
    kranz: 'Rundherum und kein Anfang. Wie ein Feuer, das gut brennt.',
  },
  mira: {
    blumen: 'Pass auf das Moos darunter auf. Das war zuerst da.',
    stillwasser: 'Darin wächst bald etwas. Gib ihm zwei Wochen.',
    weg: 'Zwischen den Steinen wird Moos stehen. Lass es.',
  },
  kiesel: {
    stillwasser: 'Zu klein zum Segeln. Trotzdem Wasser.',
    ferne: 'Die war auf See. Frag mich nicht, woher ich das weiß.',
    weg: 'Ein Weg ist eine Route an Land. Nichts anderes.',
    schild: 'Ohne Namen findet man nicht zurück. Das ist Seemannsregel.',
  },
  bruno: {
    sitzen: 'Setz dich ruhig. Ich stehe gern, aber du musst nicht.',
    buecher: 'Papier war mal Holz. Ich nehme es ihm nicht übel.',
    blumen: 'Unter jeder Blume ist Wurzelwerk. Mehr, als man sieht.',
    zaun: 'Holz, aufrecht. Daran habe ich nichts auszusetzen.',
  },
  tobi: {
    windspiel: 'Acht Röhren, acht Töne. Wer das gerechnet hat, war gut.',
    weg: 'Gerade Kanten. Endlich jemand, der misst.',
    schaukasten: 'Ordentlich sortiert. Daran erkennt man den Kopf dahinter.',
    buecher: 'Steht da drin, wie man Dinge baut? Dann lies es.',
  },
  nelly: {
    waesche: 'Und wenn etwas reißt, bringst du es mir.',
    gedeckt: 'Eine Decke darauf wäre noch schön. Ich sage ja nur.',
    kranz: 'Gebunden, nicht geknotet. Das hält länger.',
    andenken: 'Das Band daran habe ich gemacht. Vor sehr langer Zeit.',
  },
  wanda: {
    stillwasser: 'Keine Gezeiten. Seltsames Wasser.',
    voegel: 'Am Watt sind mehr. Aber die hier bleiben wenigstens.',
    schaukasten: 'Muscheln hinter Glas. Am Strand waren sie auch schön.',
    ferne: 'Alles kommt irgendwann an den Strand. Auch die.',
  },
  silke: {
    stillwasser: 'Wasser, das stillhält. Hier oben hält nur der Fels still.',
    voegel: 'Bei mir nisten sie in den Spalten. Lauter als deine.',
    schaukasten: 'Ordentlich aufgereiht. Ich lege meine einfach auf einen Stein.',
    ferne: 'Von meiner Insel sieht man weiter. Aber das hier ist hübscher.',
  },
};

/**
 * Welche Gruppe gehört zu diesem Stück? `null`, wenn es keine gibt.
 */
export function gruppeVon(itemId) {
  return GRUPPE[itemId] || null;
}

/** Was dieser Geist zu dieser Sache sagt. */
export function satzFuer(geistId, gruppe) {
  const eigen = EIGEN[geistId] && EIGEN[geistId][gruppe];
  return eigen || ALLGEMEIN[gruppe] || null;
}

/** Leerer Stand – gemerkt wird je Geist und Gruppe. */
export function emptyDekoreaktion() {
  return Object.create(null);
}

/** Der Schlüssel, unter dem ein Paar gemerkt wird. */
export function schluessel(geistId, gruppe) {
  return geistId + ':' + gruppe;
}

/** Hat dieser Geist zu dieser Sache schon etwas gesagt? */
export function schonGesagt(stand, geistId, gruppe) {
  return !!(stand && stand[schluessel(geistId, gruppe)]);
}

/**
 * Worüber dieser Geist jetzt etwas sagen würde – oder `null`.
 *
 * `itemIds` sind die Deko-Stücke in seiner Nähe. Mehrere Stücke derselben
 * Gruppe zählen als eines: Vier Laternen sind ein Lichtverhältnis und nicht
 * vier Gelegenheiten, über Licht zu reden.
 *
 * Die Reihenfolge ist die der übergebenen Stücke, nicht Zufall – damit
 * dasselbe Bild zweimal dieselbe Antwort gibt.
 *
 * @returns {?object} {gruppe, satz}
 */
export function reaktionFuer(stand, geistId, itemIds) {
  const liste = Array.isArray(itemIds) ? itemIds : [];
  const gesehen = Object.create(null);
  for (let i = 0; i < liste.length; i++) {
    const gruppe = gruppeVon(liste[i]);
    if (!gruppe || gesehen[gruppe]) continue;
    gesehen[gruppe] = 1;
    if (schonGesagt(stand, geistId, gruppe)) continue;
    const satz = satzFuer(geistId, gruppe);
    if (!satz) continue;
    return { gruppe: gruppe, satz: satz };
  }
  return null;
}

/** Eintragen, dass es gesagt wurde. Gibt den neuen Stand heraus. */
export function merke(stand, geistId, gruppe) {
  const s = stand || emptyDekoreaktion();
  s[schluessel(geistId, gruppe)] = 1;
  return s;
}

/** Wie viele Paarungen schon gesagt wurden – für die Chronik. */
export function reaktionenStand(stand) {
  return stand ? Object.keys(stand).length : 0;
}
