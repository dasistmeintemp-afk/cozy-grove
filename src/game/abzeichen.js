/**
 * Abzeichen – was aus dem wird, was ohnehin gezählt wird.
 *
 * **Warum es sie gibt.** Das Spiel zählt eine Menge mit: das Fundbuch jede
 * Art und jedes Stück, `records.js` jeden Fischrekord, `pfade.js` jede
 * abgelaufene Kachel, `momente.js` jeden bemerkten Augenblick,
 * `sternbilder.js` jedes Bild am Himmel, `orte.js` jeden selbst vergebenen
 * Namen. Sichtbar war davon fast nichts – sechs Zeilen Chronik, und das
 * war es. Zahlen, die niemand sieht, sind keine Belohnung, sondern
 * Buchhaltung.
 *
 * **Sie zählen nichts Neues mit.** Dieselbe Regel wie in `chronik.js`, und
 * zwar aus demselben Grund: Eine zweite Buchführung weicht irgendwann von
 * der ersten ab, und ein alter Spielstand stünde auf Null. Jeder Wert hier
 * kommt aus einem Feld, das es längst gibt.
 *
 * **Einmal erreicht, bleibt erreicht.** Das ist nicht Bequemlichkeit,
 * sondern Notwendigkeit: Zwei der Zahlen können SINKEN. Trampelpfade
 * verblassen täglich, und ein Weg, den man eine Woche nicht geht, ist weg
 * (siehe `pfade.js`). Wer dafür ein Abzeichen bekäme und es beim nächsten
 * Nachsehen wieder los wäre, würde zu Recht wütend. Deshalb steht im
 * Spielstand die ERREICHTE Stufe und nicht der Wert, und `faellig` gibt
 * nur, was über dieser Stufe liegt.
 *
 * **Zehn Abzeichen, vier Stufen, vierzig Namen.** Eine Stufe ohne eigenen
 * Namen wäre ein Fortschrittsbalken mit Umweg. Der Name ist das, was man
 * behält – „Alteingesessen" sagt mehr über hundert Tage als die Zahl.
 *
 * **Die Schwellen sind gemessen, nicht geraten.** Wo eine Obergrenze
 * feststeht (127 Arten, 9 Sammelreihen, 8 Fischarten, 8 Orte, 8
 * Sternbilder, 43 Momente), steht sie als letzte Stufe. Wo keine
 * feststeht, stammt die Zahl aus dem Tempomodell, mit dem auch die
 * Meilensteine gerechnet sind: rund fünfzehn erfüllte Bitten am Tag, die
 * Insel nach gut fünf Wochen ganz bunt. Bei den Pfaden ist das Sternnetz
 * vom Lager zu allen acht Geistern 397 Kacheln breit – die letzte Stufe
 * steht bei 300 und heißt deshalb „Überall schon gewesen".
 *
 * Alles hier ist reine Rechnung auf einer übergebenen Lage – dieselbe Naht
 * wie bei `chronikZeilen` und `rollSize`, damit es ohne Browser und ohne
 * halbes Spiel prüfbar bleibt.
 */

/** Die drei Familien, in der Reihenfolge, in der sie angezeigt werden. */
export const FAMILIEN = [
  { id: 'sammeln', name: 'Sammeln' },
  { id: 'erkunden', name: 'Erkunden' },
  { id: 'ausdauer', name: 'Ausdauer' },
];

export const FAMILIE_IDS = FAMILIEN.map(function (f) { return f.id; });

/**
 * Was eine Stufe einbringt.
 *
 * Glut, nicht Münzen: Glut ist die knappe Währung (ein Auftrag bringt
 * eine bis fünf, ein Bauplan kostet drei bis vier), und genau deshalb ist
 * sie das Geschenk, das man merkt. Über alle zehn Abzeichen und alle vier
 * Stufen sind das 460 Glut – bei rund 45 am Tag aus Aufträgen also etwa
 * zehn Tagesverdienste, verteilt über ein ganzes langes Spiel. Spürbar,
 * aber es dreht die Wirtschaft nicht um.
 */
export const LOHN = [3, 6, 12, 25];

/** Wie viele Stufen jedes Abzeichen hat. */
export const STUFEN = 4;

/**
 * Die Abzeichen.
 *
 * `wert` liest aus der Lage und rechnet nichts aus – wer hier rechnet,
 * baut die zweite Buchführung, die oben ausgeschlossen ist.
 */
export const ABZEICHEN = [
  // ---------------------------- Sammeln ----------------------------
  {
    id: 'arten', familie: 'sammeln', icon: 'icon_bookstack',
    name: 'Das Fundbuch',
    was: 'Arten, denen du begegnet bist',
    wert: function (l) { return l.arten || 0; },
    schwellen: [25, 55, 90, 127],
    namen: ['Neugierig', 'Vertraut', 'Kennerin', 'Nichts Neues mehr'],
  },
  {
    id: 'dinge', familie: 'sammeln', icon: 'icon_bag',
    name: 'Volle Taschen',
    was: 'Dinge, die je in der Tasche lagen',
    wert: function (l) { return l.dinge || 0; },
    schwellen: [250, 1200, 3500, 9000],
    namen: ['Aufgehoben', 'Angehäuft', 'Gehortet', 'Nichts weggeworfen'],
  },
  {
    id: 'reihen', familie: 'sammeln', icon: 'icon_shell',
    name: 'Die Vitrine',
    was: 'vollständige Sammelreihen',
    wert: function (l) { return l.reihen || 0; },
    schwellen: [1, 3, 6, 9],
    namen: ['Angefangen', 'Im Regal', 'Beinahe vollständig', 'Lückenlos'],
  },
  {
    id: 'fische', familie: 'sammeln', icon: 'icon_rod',
    name: 'Am Wasser',
    was: 'Fischarten mit eigenem Maß',
    wert: function (l) { return l.fische || 0; },
    schwellen: [2, 4, 6, 8],
    namen: ['Nass geworden', 'Geduldig', 'Mit Gefühl', 'Jede Art gemessen'],
  },
  // --------------------------- Erkunden ----------------------------
  {
    id: 'pfade', familie: 'erkunden', icon: 'icon_path_tile',
    name: 'Ausgetreten',
    was: 'Kacheln mit sichtbarem Pfad',
    wert: function (l) { return l.pfade || 0; },
    schwellen: [15, 60, 150, 300],
    namen: ['Ein Trampelpfad', 'Ein Weg', 'Ein Wegenetz', 'Überall schon gewesen'],
  },
  {
    id: 'orte', familie: 'erkunden', icon: 'icon_signpost',
    name: 'Auf den Namen',
    was: 'Orte, die du selbst benannt hast',
    wert: function (l) { return l.orte || 0; },
    schwellen: [1, 3, 5, 8],
    namen: ['Erster Name', 'Drei Namen', 'Eigene Karte', 'Alles benannt'],
  },
  {
    id: 'sterne', familie: 'erkunden', icon: 'icon_star',
    name: 'Der klare Himmel',
    was: 'gefundene Sternbilder',
    wert: function (l) { return l.sterne || 0; },
    schwellen: [2, 4, 6, 8],
    namen: ['Hochgeschaut', 'Vier Bilder', 'Fast alle', 'Der ganze Himmel'],
  },
  // --------------------------- Ausdauer ----------------------------
  {
    id: 'tage', familie: 'ausdauer', icon: 'icon_day',
    name: 'Auf der Insel',
    was: 'Tage hier',
    wert: function (l) { return l.tage || 0; },
    schwellen: [7, 21, 50, 100],
    namen: ['Angekommen', 'Eingelebt', 'Dazugehörig', 'Alteingesessen'],
  },
  {
    id: 'bitten', familie: 'ausdauer', icon: 'icon_quest',
    name: 'Immer zur Stelle',
    was: 'erfüllte Bitten',
    wert: function (l) { return l.bitten || 0; },
    schwellen: [25, 100, 300, 600],
    namen: ['Hilfsbereit', 'Verlässlich', 'Unentbehrlich', 'Niemand fragt umsonst'],
  },
  {
    id: 'momente', familie: 'ausdauer', icon: 'icon_sparkle',
    name: 'Hingesehen',
    was: 'bemerkte Momente',
    wert: function (l) { return l.momente || 0; },
    schwellen: [5, 15, 30, 43],
    namen: ['Bemerkt', 'Wachsam', 'Nichts entgeht dir', 'Alle Momente'],
  },
];

export const ABZEICHEN_IDS = ABZEICHEN.map(function (a) { return a.id; });

/** Ein Abzeichen nachschlagen. */
export function abzeichenVon(id) {
  for (let i = 0; i < ABZEICHEN.length; i++) {
    if (ABZEICHEN[i].id === id) return ABZEICHEN[i];
  }
  return null;
}

/** Wie viele Stufen es insgesamt zu holen gibt. */
export const STUFEN_GESAMT = ABZEICHEN.length * STUFEN;

/** Leerer Stand: Kennung → erreichte Stufe. */
export function emptyAbzeichen() {
  return Object.create(null);
}

/**
 * Einen gespeicherten Stand einlesen und säubern.
 *
 * Unbekannte Kennungen fliegen heraus, nicht nur aus Ordnungsliebe: Würde
 * ein Abzeichen je umbenannt, hinge sonst für immer eine Stufe im Stand,
 * die zu nichts gehört, und die Zählung „27 von 40" stimmte nicht mehr.
 */
export function abzeichenAus(roh) {
  const out = emptyAbzeichen();
  if (!roh || typeof roh !== 'object') return out;
  for (let i = 0; i < ABZEICHEN.length; i++) {
    const id = ABZEICHEN[i].id;
    const n = Math.floor(Number(roh[id]));
    if (!(n > 0)) continue;
    out[id] = Math.min(STUFEN, n);
  }
  return out;
}

/** Welche Stufe dieser Wert hergibt – 0, wenn noch keine. */
export function stufeFuerWert(abz, n) {
  let s = 0;
  for (let i = 0; i < abz.schwellen.length; i++) {
    if ((n || 0) >= abz.schwellen[i]) s = i + 1;
  }
  return s;
}

/** Welche Stufe im Stand steht. */
export function stufeVon(erreicht, id) {
  const n = erreicht ? erreicht[id] : 0;
  return n > 0 ? Math.min(STUFEN, n) : 0;
}

/**
 * Was gerade fällig ist – und zwar jede Stufe einzeln.
 *
 * Wer mit einem alten Spielstand ankommt, hat womöglich drei Stufen auf
 * einmal offen. Die kommen dann auch alle drei, jede mit ihrem Namen und
 * ihrem Lohn – dieselbe Entscheidung wie bei `dueAt` in `milestones.js`.
 *
 * @returns {Array} [{abzeichen, stufe, name, lohn}] von unten nach oben
 */
export function faellig(lage, erreicht) {
  const raus = [];
  const l = lage || {};
  for (let i = 0; i < ABZEICHEN.length; i++) {
    const a = ABZEICHEN[i];
    const hat = stufeVon(erreicht, a.id);
    const soll = stufeFuerWert(a, a.wert(l));
    for (let s = hat + 1; s <= soll; s++) {
      raus.push({ abzeichen: a, stufe: s, name: a.namen[s - 1], lohn: LOHN[s - 1] });
    }
  }
  return raus;
}

/** Eine Stufe eintragen. Zurück geht es nie. */
export function merke(erreicht, id, stufe) {
  const stand = erreicht || emptyAbzeichen();
  const neu = Math.min(STUFEN, Math.max(0, Math.floor(stufe || 0)));
  if (neu > stufeVon(stand, id)) stand[id] = neu;
  return stand;
}

/**
 * Alles, was die Anzeige braucht – eine Zeile je Abzeichen.
 *
 * Der angezeigte Wert ist der WIRKLICHE, nicht der, der zur Stufe passt:
 * Wer seine Pfade hat verwachsen lassen, soll das sehen. Das Abzeichen
 * bleibt trotzdem.
 *
 * @param {object} lage die rohen Zahlen
 * @param {object} erreicht der Spielstand
 * @returns {Array} [{familie, zeilen: [...]}]
 */
export function abzeichenStand(lage, erreicht) {
  const l = lage || {};
  const raus = [];
  for (let f = 0; f < FAMILIEN.length; f++) {
    const zeilen = [];
    for (let i = 0; i < ABZEICHEN.length; i++) {
      const a = ABZEICHEN[i];
      if (a.familie !== FAMILIEN[f].id) continue;
      const wert = a.wert(l);
      const stufe = stufeVon(erreicht, a.id);
      const naechste = stufe < STUFEN ? a.schwellen[stufe] : null;
      zeilen.push({
        id: a.id, icon: a.icon, name: a.name, was: a.was,
        wert: wert, stufe: stufe,
        // Der Name der ERREICHTEN Stufe, nicht der nächsten: Was man hat,
        // steht da; was fehlt, steht als Zahl daneben.
        titel: stufe > 0 ? a.namen[stufe - 1] : '',
        naechste: naechste,
        fehlt: naechste == null ? 0 : Math.max(0, naechste - wert),
      });
    }
    raus.push({ id: FAMILIEN[f].id, name: FAMILIEN[f].name, zeilen: zeilen });
  }
  return raus;
}

/** Wie viele Stufen erreicht sind – für die Zeile über der Liste. */
export function stufenGesamt(erreicht) {
  let n = 0;
  for (let i = 0; i < ABZEICHEN.length; i++) n += stufeVon(erreicht, ABZEICHEN[i].id);
  return { erreicht: n, gesamt: STUFEN_GESAMT };
}
