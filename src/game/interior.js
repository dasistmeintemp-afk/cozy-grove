/**
 * Das Hausinnere – der eine Ort, der ganz dir gehört.
 *
 * Draußen gehört alles halb der Insel: Wo eine Bank stehen kann, entscheidet
 * der Boden; was gut aussieht, entscheidet der Geist, der sich etwas wünscht;
 * und die Gemütlichkeit zählt für seinen Farbkreis. Das ist richtig so – das
 * Spiel handelt vom Zurückbringen einer Insel.
 *
 * Aber es fehlte der Gegenpol: **ein Raum, in dem niemand etwas will.** Vier
 * Ausbaustufen hatte das Haus, alle von außen. Man baute sich ein Haus mit
 * Veranda und konnte nicht hinein.
 *
 * **Was drinnen anders ist:**
 *
 * 1. **Der ganze Raum ist immer zu sehen.** Keine Kamera, die hinterherfährt –
 *    man sieht, was man eingerichtet hat, in einem Bild. Das ist der halbe
 *    Grund, warum Einrichten Spaß macht.
 * 2. **Es gibt keine Aufgabe.** Niemand wünscht sich hier etwas, keine Bitte
 *    zeigt hinein, kein Geist zählt mit. Was hier steht, steht, weil es dir
 *    gefällt.
 * 3. **Es wirkt trotzdem.** Ein Zuhause, in dem es schön ist, färbt die Insel
 *    um sich herum weiter ein – siehe `wohnBonus`. Das ist die Währung, die
 *    das Spiel ohnehin hat; eine zweite Zahl daneben wäre Verwaltung.
 *
 * **Der Raum wächst mit dem Haus.** Wer im Zelt wohnt, hat eine Ecke; wer das
 * Haus mit Veranda gebaut hat, hat ein Zimmer. Damit bekommen die vier
 * Ausbaustufen zum ersten Mal etwas, das man betreten kann.
 */
import { MAX_HOUSE_STAGE } from './house.js';

/**
 * Wie groß der Raum je Ausbaustufe ist, in Bildpunkten.
 *
 * Die Zahlen sind so gewählt, dass auch die größte Stufe auf einer normalen
 * Zeichenfläche ganz zu sehen ist – siehe oben, Punkt 1. Ein Zimmer, an dem
 * man vorbeiscrollen muss, ist ein zweites Draußen.
 *
 * `wand` ist die gemalte Wandhöhe oben; sie gehört NICHT zum begehbaren
 * Boden, sondern steht darüber. Deshalb steht sie getrennt: Sonst wäre die
 * Bodenfläche eine andere Zahl als die gemalte, und Seli liefe in die Wand.
 */
export const RAEUME = [
  { stufe: 1, name: 'Die Zeltecke', w: 420, h: 300, wand: 96 },
  { stufe: 2, name: 'Die Stube', w: 620, h: 420, wand: 120 },
  { stufe: 3, name: 'Das Zimmer', w: 800, h: 540, wand: 140 },
  { stufe: 4, name: 'Zimmer mit Veranda', w: 960, h: 620, wand: 150 },
];

/**
 * Die Kammer – der zweite Raum, ab dem großen Haus.
 *
 * **Warum überhaupt ein zweiter Raum.** Nicht wegen der Fläche. Ein größeres
 * Zimmer hätte dasselbe getan und weniger gekostet. Der Grund ist ein
 * anderer: Ein Raum hat **einen** Ton. Wer Wand und Boden auf Abendblau
 * stellt, stellt damit alles auf Abendblau, und jedes Stück, das nicht dazu
 * passt, muss weg. Mit zwei Räumen wird aus dem Einrichten zum ersten Mal
 * eine Entscheidung, die man zweimal treffen darf – vorn das Wohnliche,
 * hinten die Werkstatt, und beide mit eigener Ausstattung.
 *
 * **Sie ist kleiner als das Zimmer davor**, und das ist Absicht. Eine zweite
 * Halle wäre die doppelte Arbeit für dasselbe Gefühl; eine Kammer ist ein
 * Ort, den man vollkriegt.
 *
 * **Sie kommt erst mit dem großen Haus.** Wer im Zelt wohnt, hat eine Ecke –
 * eine Tür in eine zweite Zeltecke wäre albern. Und sie hat weder Bett noch
 * Ausgang: Geschlafen und hinausgegangen wird vorn.
 */
export const KAMMERN = [
  { stufe: 3, name: 'Die Kammer', w: 520, h: 400, wand: 140, bett: false, ausgang: false, fenster: 0 },
  { stufe: 4, name: 'Die Werkkammer', w: 660, h: 470, wand: 150, bett: false, ausgang: false, fenster: 0 },
];

/**
 * Hat dieser Raum ein Bett? Und einen Ausgang nach draußen?
 *
 * Gefragt wird auf `!== false`, nicht auf `=== true`: Die vier Zimmer vorn
 * schreiben es gar nicht hin, und das sollen sie auch nicht müssen. Nur wer
 * KEINS hat, sagt es – die Ausnahme trägt die Beschriftung, nicht die Regel.
 */
export function hatBett(raum) {
  return !!raum && raum.bett !== false;
}

export function hatAusgang(raum) {
  return !!raum && raum.ausgang !== false;
}

/**
 * Gibt es hier eine Verbindungstür?
 *
 * Aus der Ausbaustufe abgeleitet und nicht an jedem Raum vermerkt: Die Stufe
 * steht ohnehin an jedem Raum, und zwei Stellen, die dasselbe wissen müssen,
 * laufen irgendwann auseinander.
 */
export function hatVerbindung(raum) {
  return !!raum && raum.stufe >= KAMMER_AB;
}

/** Ab welcher Ausbaustufe es die Kammer gibt. */
export const KAMMER_AB = 3;

/**
 * Wand und Boden, zum Wechseln.
 *
 * Das Stück Animal Crossing, das in einem Zimmer am meisten ausmacht: nicht
 * WAS drinsteht, sondern worin es steht. Vier Ausstattungen, und sie kosten
 * nichts – drinnen soll nichts Pflicht sein, auch nicht das Bezahlen.
 *
 * `stoff` und `erde` sind die Zeltfassung derselben Ausstattung: Die Zeltecke
 * hat keine Dielen und keine Bretterwand, aber sie soll denselben Ton
 * treffen wie das Zimmer, in das sie einmal wird.
 *
 * Gemalt wird erst, wenn jemand eine Ausstattung wirklich benutzt (siehe
 * `ensureRoom` in sprites.js). Vier Stufen mal vier Ausstattungen wären
 * sechzehn große Bilder beim Start – gebraucht wird eines.
 */
export const AUSSTATTUNG = [
  {
    id: 'holz', name: 'Holz und Kalk',
    wand: '#ece0c8', wandTief: '#d3c0a0', leiste: '#8f6d49',
    boden: '#c9a273', bodenTief: '#a17b52',
    stoff: '#e8dfc8', stoffTief: '#c9bb9c', erde: '#bfa27c',
  },
  {
    id: 'moos', name: 'Moos und Eiche',
    wand: '#dbe3ca', wandTief: '#b9c6a4', leiste: '#6f7f55',
    boden: '#b79468', bodenTief: '#93714b',
    stoff: '#dee6cf', stoffTief: '#bcc7a8', erde: '#b09572',
  },
  {
    id: 'abend', name: 'Abendblau',
    wand: '#cfd8e4', wandTief: '#aab8cb', leiste: '#5d6c82',
    boden: '#a98f78', bodenTief: '#866d58',
    stoff: '#d6dde6', stoffTief: '#b2bdcb', erde: '#a3917c',
  },
  {
    id: 'sand', name: 'Sand und Muschel',
    wand: '#f1e6d4', wandTief: '#dccfb6', leiste: '#a8906c',
    boden: '#ddc8a4', bodenTief: '#bda57e',
    stoff: '#f2ead9', stoffTief: '#d9cdb4', erde: '#d3bd9a',
  },
];

export const AUSSTATTUNG_IDS = AUSSTATTUNG.map(function (a) { return a.id; });

/** Die Ausstattung zu einer Kennung – oder die erste, wenn es sie nicht gibt. */
export function ausstattungFuer(id) {
  for (let i = 0; i < AUSSTATTUNG.length; i++) {
    if (AUSSTATTUNG[i].id === id) return AUSSTATTUNG[i];
  }
  return AUSSTATTUNG[0];
}

/** Wie breit die Tür ist – dort geht es wieder hinaus. */
export const TUER_BREITE = 104;

/* ------------------------------------------------------------------- Wand */

/**
 * Die Fenster in der Rückwand.
 *
 * Steht hier und nicht im Maler, weil es zwei Stellen gibt, die es wissen
 * müssen: das Bild UND die Frage, wo ein Wandstück hängen darf. Ein Bild
 * quer über dem Fenster wäre genau die Sorte Fehler, die man erst sieht,
 * wenn sie schon im Spielstand steht.
 *
 * Die Zeltecke hat keines – ein Zelt hat kein Fenster. Die Kammer auch
 * nicht, und das ist kein Sparen: Sie ist der Raum HINTER dem Zimmer, ihr
 * Licht fällt durch die Verbindungstür. Ein Fenster hätte dort mitten in
 * einer ohnehin kurzen Wand gestanden und von fünf Aufhängepunkten drei
 * gekostet – gemessen. Und es macht aus den beiden Räumen zwei verschiedene
 * Orte statt zweier Größen desselben.
 */
export const FENSTER_B = 92;

export function fensterFuer(raum) {
  if (raum.stufe <= 1 || raum.fenster === 0) return [];
  const n = raum.stufe >= 4 ? 2 : 1;
  const h = Math.min(66, raum.wand - 36);
  const y0 = Math.round((raum.wand - h) / 2);
  const raus = [];
  for (let i = 0; i < n; i++) {
    const cx = raum.w * ((i + 1) / (n + 1));
    raus.push({ x: cx - FENSTER_B / 2, y: y0, w: FENSTER_B, h: h });
  }
  return raus;
}

/**
 * Wie viel Platz ein Wandstück um sich braucht.
 *
 * Enger als am Boden: An einer Wand hängt man Bilder dichter nebeneinander
 * als man Stühle hinstellt.
 */
export const WAND_ABSTAND = 74;

/**
 * Abstand zum Rand der Wand – waagerecht und senkrecht GETRENNT.
 *
 * Waagerecht muss auch das breiteste Wandstück (das Wandbrett, 96 Punkte)
 * mit seinem Mittelpunkt noch ganz auf die Wand passen. Senkrecht darf der
 * Rand dagegen kaum etwas sein: Die Zeltwand ist 96 Punkte hoch, und mit
 * demselben Rand von 54 oben und unten blieb dort **kein einziger Platz**
 * übrig – gemessen, nicht vermutet. Eine Zahl für beide Richtungen sah
 * sauber aus und machte die Zeltecke wandlos.
 */
export const WAND_RAND = 54;
export const WAND_RAND_Y = 8;

/**
 * Auf welcher Höhe ein Wandstück hängt.
 *
 * Eine Höhe, nicht mehrere: Wer die Höhe selbst wählen kann, richtet
 * zwanzig Minuten lang Bilder gerade aus. Eine Reihe auf gleicher Höhe sieht
 * ohnehin besser aus, und das Spiel nimmt einem die Entscheidung ab, die
 * keine ist.
 */
export function wandHoehe(raum) {
  return Math.round(raum.wand * 0.5);
}

/** Wie viele Stücke an eine Wand passen. */
export function maxWandStuecke(raum) {
  return Math.max(3, Math.floor((raum.w - WAND_RAND * 2) / WAND_ABSTAND));
}

/** Liegt der Punkt auf der Rückwand? */
export function anDerWand(x, y, raum) {
  return x >= WAND_RAND && x <= raum.w - WAND_RAND &&
    y >= WAND_RAND_Y && y <= raum.wand - WAND_RAND_Y;
}

/**
 * Ist an der Wand hier Platz?
 *
 * Zwei Bedingungen: nicht über einem anderen Stück und nicht über dem
 * Fenster. Ein Bild vor dem Fenster nähme dem Zimmer sein Licht – und das
 * Licht ist das, was den Raum von einem Karton unterscheidet.
 */
export function wandPlatzFrei(wand, x, y, raum, ausser) {
  if (!anDerWand(x, y, raum)) return false;
  const fenster = fensterFuer(raum);
  for (let i = 0; i < fenster.length; i++) {
    const f = fenster[i];
    if (x > f.x - WAND_ABSTAND * 0.6 && x < f.x + f.w + WAND_ABSTAND * 0.6) return false;
  }
  // Und nicht hinter das Bett. Das Bett steht davor und verdeckt die Wand –
  // physikalisch richtig, aber ein Bild, das man aufhängt und nie wieder
  // sieht, ist ein verschenktes Bild. Im Bild nachgesehen und dort gefunden.
  const b = bettFuer(raum);
  // Grosszügig gerechnet: Bei knapperem Abstand schaute die Ecke des
  // Wandbretts hinter dem Kopfteil hervor – halb verdeckt ist schlechter als
  // gar nicht dort. In der Kammer steht kein Bett, dort entfällt die Regel.
  if (b && Math.abs(b.x - x) < BETT_BREITE / 2 + WAND_ABSTAND * 0.7) return false;
  // Und nicht über die Verbindungstür. Sie sitzt oben in der Wand, genau
  // dort, wo sonst Bilder hängen – ein Kranz über der Tür wäre ein Kranz,
  // durch den man hindurchläuft.
  if (hatVerbindung(raum)) {
    const t = innenTuerFuer(raum);
    if (x > t.x - WAND_ABSTAND * 0.7 && x < t.x + t.w + WAND_ABSTAND * 0.7) return false;
  }
  const liste = wand || [];
  for (let i = 0; i < liste.length; i++) {
    const s = liste[i];
    if (s === ausser) continue;
    if (Math.abs(s.x - x) < WAND_ABSTAND) return false;
  }
  return true;
}

/** Das Wandstück über diesem Punkt – oder null. */
export function wandStueckAn(wand, x, reichweite) {
  const liste = wand || [];
  const r = reichweite || WAND_ABSTAND;
  let best = null;
  let bestD = r;
  for (let i = 0; i < liste.length; i++) {
    const d = Math.abs(liste[i].x - x);
    if (d <= bestD) { bestD = d; best = liste[i]; }
  }
  return best;
}

/**
 * Wie viel Platz ein Möbelstück um sich braucht.
 *
 * Kleiner als draußen (28): In einem Zimmer sollen Stühle an einem Tisch
 * stehen können, ohne dass das Spiel „kein Platz" sagt.
 */
export const STUECK_ABSTAND = 40;

/** Abstand, den Seli von der Wand hält – sie ist keine Fläche, sie hat Breite. */
export const RAND = 22;

/**
 * Wie viele Stücke in einen Raum passen.
 *
 * Aus der Fläche gerechnet statt fest gesetzt: Sonst hätte die Zeltecke
 * dieselbe Obergrenze wie das große Zimmer, und die eine wäre voll, während
 * die andere leer wirkt. Die Grenze gibt es überhaupt nur, damit ein Raum
 * nicht zum Warenlager wird – erreichen wird sie beim Einrichten niemand.
 */
export function maxStuecke(raum) {
  return Math.max(12, Math.round((raum.w * raum.h) / 5200));
}

/**
 * Alle Räume einer Ausbaustufe – vorn zuerst.
 *
 * Die Liste ist die Wahrheit über das Zuhause: Wie viele Räume es gibt, wie
 * sie heißen und wie groß sie sind, steht an genau dieser Stelle. Alles
 * andere – der Spielstand, das Zeichnen, die Gemütlichkeit – zählt darüber.
 */
export function raeumeFuer(stufe) {
  const n = Math.max(1, Math.min(MAX_HOUSE_STAGE, stufe | 0 || 1));
  const raus = [];
  for (let i = 0; i < RAEUME.length; i++) if (RAEUME[i].stufe === n) raus.push(RAEUME[i]);
  if (!raus.length) raus.push(RAEUME[0]);
  for (let i = 0; i < KAMMERN.length; i++) if (KAMMERN[i].stufe === n) raus.push(KAMMERN[i]);
  return raus;
}

/** Wie viele Räume die Ausbaustufe hergibt. */
export function raumZahl(stufe) {
  return raeumeFuer(stufe).length;
}

/**
 * Der Raum zu einer Ausbaustufe.
 *
 * Ohne zweites Argument der vordere – so, wie es vor der Kammer war. Das ist
 * kein Zufall, sondern der Grund, warum die Umstellung klein blieb: Wer nur
 * „das Zimmer" meint, meint weiterhin das Zimmer.
 */
export function raumFuer(stufe, index) {
  const alle = raeumeFuer(stufe);
  const i = Math.max(0, Math.min(alle.length - 1, index | 0));
  return alle[i];
}

/**
 * Die Verbindungstür – oben in der Rückwand, rechts.
 *
 * Oben und nicht an der Seite: Der Raum ist als Rückwand über Boden gemalt,
 * und eine Seitenwand gibt es gar nicht. Eine Tür in einer Wand, die nicht
 * da ist, wäre ein Loch im Bildrand.
 *
 * Unten in der Mitte liegt der Ausgang nach draußen; die Verbindungstür sitzt
 * deshalb oben. Das ist auch ohne Beschriftung zu lesen: nach unten hinaus,
 * nach oben weiter hinein.
 *
 * Es gibt sie in BEIDEN Räumen an derselben Stelle – vorn führt sie nach
 * hinten, hinten führt sie zurück. Zwei verschiedene Türen wären zwei Bilder
 * und eine Regel mehr, für nichts.
 */
export const INNENTUER_BREITE = 96;

export function innenTuerFuer(raum) {
  // Ganz rechts, hart an den Wandrand.
  //
  // Bei 78 % der Breite sah sie besser aus und war trotzdem falsch: Im
  // Zimmer der dritten Stufe landete sie genau im breitesten freien Stück
  // Wand und liess von fünfzehn Aufhängepunkten sieben übrig. In der Ecke
  // kostet sie nur den Rand, den ohnehin niemand nutzt – gemessen, nicht
  // geschätzt.
  return {
    x: Math.max(WAND_RAND, raum.w - WAND_RAND - INNENTUER_BREITE),
    w: INNENTUER_BREITE,
  };
}

/** Wie tief der Streifen vor der Verbindungstür ist. */
export const INNENTUER_TIEFE = 56;

/** Steht dieser Punkt vor der Verbindungstür? */
export function anDerInnenTuer(x, y, raum) {
  if (!hatVerbindung(raum)) return false;
  const t = innenTuerFuer(raum);
  return y <= INNENTUER_TIEFE && x >= t.x && x <= t.x + t.w;
}

/**
 * Wo die Tür liegt – unten in der Mitte.
 *
 * Der Rückgabewert ist der begehbare Streifen davor, nicht die gemalte
 * Zarge: Danach wird gefragt, ob Seli gerade hinausgehen kann.
 */
export function tuerFuer(raum) {
  if (!hatAusgang(raum)) return null;
  return {
    x: raum.w / 2 - TUER_BREITE / 2,
    w: TUER_BREITE,
    y: raum.h,
  };
}

/** Wie tief der freizuhaltende Streifen vor der Tür ist. */
export const TUER_TIEFE = 64;

/** Steht dieser Punkt auf der Tür? */
export function anDerTuer(x, y, raum) {
  const t = tuerFuer(raum);
  if (!t) return false;
  return y >= raum.h - TUER_TIEFE && x >= t.x && x <= t.x + t.w;
}

/**
 * Wo das Bett steht.
 *
 * Fest eingebaut, nicht zum Umstellen: Es ist der Grund, warum man abends
 * hineingeht, und ein Bett, das man versehentlich einpacken kann, wäre die
 * eine Stelle, an der man sich die Nacht verbauen könnte.
 *
 * Hinten links an der Wand – die Ecke, die beim Einrichten am wenigsten
 * fehlt, und der Punkt, an dem es nicht vor der Tür steht.
 */
export function bettFuer(raum) {
  if (!hatBett(raum)) return null;
  return {
    x: Math.round(raum.w * 0.2),
    // Nicht weiter nach oben, als die Wand hoch ist. Das Bett ist von seinem
    // Fußpunkt aus 180 Punkte hoch; in der Zeltecke (Wand 96) ragte es
    // dadurch oben aus dem Zimmer heraus – im Bild deutlich zu sehen, in der
    // Rechnung nicht. Deshalb steht die Zahl hier und nicht im Maler.
    y: Math.round(Math.max(BETT_HOEHE - raum.wand + 8, RAND + raum.h * 0.14)),
  };
}

/** Wie hoch das Bett über seinem Fußpunkt steht – siehe `paintBed`. */
export const BETT_HOEHE = 180;

/** Und wie breit – für die Frage, welches Stück Wand es verdeckt. */
export const BETT_BREITE = 150;

/** Steht Seli am Bett? */
export function amBett(x, y, raum) {
  const b = bettFuer(raum);
  if (!b) return false;
  const dx = b.x - x;
  const dy = b.y - y;
  return dx * dx + dy * dy <= 78 * 78;
}

/** Liegt der Punkt auf dem begehbaren Boden? */
export function imRaum(x, y, raum) {
  return x >= RAND && x <= raum.w - RAND && y >= RAND && y <= raum.h - RAND;
}

/** Denselben Punkt, aber in den Raum hineingezogen. */
export function klemmeInRaum(x, y, raum) {
  return {
    x: Math.max(RAND, Math.min(raum.w - RAND, x)),
    y: Math.max(RAND, Math.min(raum.h - RAND, y)),
  };
}

/**
 * Ist hier Platz für ein Stück?
 *
 * Drei Bedingungen: im Raum, nicht auf einem anderen Stück, und nicht vor der
 * Tür. Die letzte ist die wichtigste – wer seinen Ausgang zustellt, käme
 * nicht mehr heraus, und das wäre die einzige Sackgasse im ganzen Spiel.
 */
export function platzFrei(stuecke, x, y, raum, ausser) {
  if (!imRaum(x, y, raum)) return false;
  if (anDerTuer(x, y, raum)) return false;
  // Und nicht ins Bett. Es ist fest eingebaut; ein Stuhl darin sähe nicht
  // nur seltsam aus, er versperrte auch die Nacht.
  const b = bettFuer(raum);
  if (b) {
    const bdx = b.x - x;
    const bdy = b.y - y;
    if (bdx * bdx + bdy * bdy < 66 * 66) return false;
  }
  // Und nicht vor die Verbindungstür. Dieselbe Regel wie am Ausgang, aus
  // demselben Grund: Ein zugestellter Durchgang wäre die einzige Sackgasse,
  // die dieses Spiel anbieten könnte.
  if (anDerInnenTuer(x, y, raum)) return false;
  const liste = stuecke || [];
  const d2 = STUECK_ABSTAND * STUECK_ABSTAND;
  for (let i = 0; i < liste.length; i++) {
    const s = liste[i];
    if (s === ausser) continue;
    const dx = s.x - x;
    const dy = s.y - y;
    if (dx * dx + dy * dy < d2) return false;
  }
  return true;
}

/** Das Stück an diesem Punkt – oder null. */
export function stueckAn(stuecke, x, y, reichweite) {
  const liste = stuecke || [];
  const r = reichweite || STUECK_ABSTAND;
  let best = null;
  let bestD = r * r;
  for (let i = 0; i < liste.length; i++) {
    const s = liste[i];
    const dx = s.x - x;
    const dy = s.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= bestD) { bestD = d2; best = s; }
  }
  return best;
}

/**
 * Wie gemütlich es hier ist.
 *
 * Dieselbe Zahl wie draußen – `charm` je Stück –, damit nicht zwei
 * Bewertungen nebeneinander stehen, die verschiedene Dinge meinen. Eine
 * Mondlaterne ist drinnen so viel wert wie draußen.
 */
export function gemuetlichkeit(stuecke, getItem, wand) {
  let summe = 0;
  const zaehle = function (liste) {
    const l = liste || [];
    for (let i = 0; i < l.length; i++) {
      const it = getItem(l[i].id);
      summe += (it && it.charm) || 0;
    }
  };
  zaehle(stuecke);
  // Was an der Wand hängt, zählt genauso: Ein Bild macht ein Zimmer
  // wohnlicher als ein weiterer Stuhl.
  zaehle(wand);
  return summe;
}

/**
 * Wie das Zuhause heißt, das man sich eingerichtet hat.
 *
 * Wie bei den Wünschen: kein Rang mit Rechten, nur ein Wort. Die Schwellen
 * sind niedrig gehalten – das erste Wort soll man am Tag bekommen, an dem man
 * das erste Mal hineingeht und eine Laterne hinstellt.
 */
export const WOHN_STUFEN = [
  { ab: 0, name: 'Leer' },
  { ab: 6, name: 'Das Nötigste' },
  { ab: 16, name: 'Wohnlich' },
  { ab: 32, name: 'Richtig gemütlich' },
  { ab: 55, name: 'Hier will man bleiben' },
];

export function wohnStufe(punkte) {
  let r = WOHN_STUFEN[0];
  for (let i = 0; i < WOHN_STUFEN.length; i++) {
    if ((punkte || 0) >= WOHN_STUFEN[i].ab) r = WOHN_STUFEN[i];
  }
  return r;
}

/** Wie viele Punkte bis zum nächsten Wort – oder null auf der letzten Stufe. */
export function bisZurNaechstenWohnstufe(punkte) {
  for (let i = 0; i < WOHN_STUFEN.length; i++) {
    if ((punkte || 0) < WOHN_STUFEN[i].ab) return WOHN_STUFEN[i].ab - (punkte || 0);
  }
  return null;
}

/** Ab hier bringt das nächste Stück keinen Farbkreis mehr. */
export const WOHN_BONUS_MAX = 120;

/**
 * Wie weit ein schönes Zuhause zusätzlich einfärbt.
 *
 * **Das ist die einzige Wirkung, die das Zimmer nach außen hat** – und sie
 * ist mit Absicht klein. Der Farbkreis des Hauses liegt je nach Stufe bei 120
 * bis 420; hier kommen höchstens 120 dazu. Ein Zimmer, das den halben Fleck
 * einfärbt, machte aus dem Einrichten eine Pflicht, und drinnen soll nichts
 * Pflicht sein.
 *
 * Die Wirkung braucht auch kein Zelt: Wer noch im Zelt wohnt, hat kaum Platz
 * für Möbel, und die Zahl käme ohnehin nicht zustande.
 */
export function wohnBonus(punkte) {
  const p = punkte > 0 ? punkte : 0;
  return Math.min(WOHN_BONUS_MAX, Math.round(p * 2));
}

/** Ein leeres einzelnes Zimmer. */
export function emptyRaum() {
  return { stuecke: [], wand: [], ausstattung: AUSSTATTUNG[0].id };
}

/**
 * Ein leeres Zuhause – wie `emptyPet` und `emptyFeste`.
 *
 * Eine **Liste** von Räumen, auch solange es nur einen gibt. Der erste
 * Entwurf hatte `stuecke`, `wand` und `ausstattung` flach obenauf, und die
 * Kammer wäre daneben als zweites Feld dazugekommen – ein Zuhause mit einem
 * Zimmer und einem Anhängsel. Eine Liste sagt, was wirklich gilt: Das
 * Zuhause hat Räume, und der vordere ist der erste davon.
 */
export function emptyInterior() {
  return { raeume: [emptyRaum()] };
}

/**
 * Ein einzelnes Zimmer wieder gerade ziehen.
 *
 * Ein Spielstand, der von Hand bearbeitet wurde, hat vielleicht Unsinn
 * darin. Das darf das Spiel nicht zum Stehen bringen – dieselbe Haltung wie
 * bei `Inventory.fromJSON`, das unbekannte Gegenstände still verwirft.
 */
export function raumAus(roh, raum, kennt) {
  const leer = emptyRaum();
  if (!roh || typeof roh !== 'object' || Array.isArray(roh)) return leer;
  const rein = Array.isArray(roh.stuecke) ? roh.stuecke : [];
  const raus = [];
  const grenze = maxStuecke(raum);
  for (let i = 0; i < rein.length && raus.length < grenze; i++) {
    const s = rein[i];
    if (!s || typeof s.id !== 'string') continue;
    if (kennt && !kennt(s.id)) continue;
    const x = Number(s.x);
    const y = Number(s.y);
    if (!isFinite(x) || !isFinite(y)) continue;
    // In den Raum ziehen statt verwerfen: Wer das Haus ausbaut, soll seine
    // Möbel behalten – und wer eines Tages wieder kleiner wohnte, auch.
    const p = klemmeInRaum(x, y, raum);
    // Aber nie vor eine Tür. Ein Stück, das nach dem Ziehen im Ausgang oder
    // im Durchgang steht, wäre das einzige, was einen in diesem Spiel
    // einsperren könnte.
    if (anDerTuer(p.x, p.y, raum)) p.y = raum.h - TUER_TIEFE - STUECK_ABSTAND;
    if (anDerInnenTuer(p.x, p.y, raum)) p.y = INNENTUER_TIEFE + STUECK_ABSTAND;
    raus.push({ id: s.id, x: p.x, y: Math.max(RAND, p.y) });
  }
  // Die Wand führt eine eigene Liste: Ihre Koordinaten zählen von der
  // Wandoberkante, nicht vom Boden, und gezeichnet wird sie hinter allem.
  // Zwei Listen sind ehrlicher als ein Merkmal an jedem Stück.
  const wand = [];
  const wandRein = Array.isArray(roh.wand) ? roh.wand : [];
  const wandGrenze = maxWandStuecke(raum);
  for (let i = 0; i < wandRein.length && wand.length < wandGrenze; i++) {
    const s = wandRein[i];
    if (!s || typeof s.id !== 'string') continue;
    if (kennt && !kennt(s.id)) continue;
    const x = Number(s.x);
    if (!isFinite(x)) continue;
    wand.push({
      id: s.id,
      x: Math.max(WAND_RAND, Math.min(raum.w - WAND_RAND, x)),
      y: wandHoehe(raum),
    });
  }
  return { stuecke: raus, wand: wand, ausstattung: ausstattungFuer(roh.ausstattung).id };
}

/**
 * Ein geladenes Zuhause wieder gerade ziehen.
 *
 * Drei Fälle, und alle drei kommen wirklich vor:
 *
 * 1. **Gar keines.** Ein Spielstand aus der Zeit vor dem Zimmer.
 * 2. **Ein flaches.** Ein Spielstand aus der Zeit vor der Kammer: `stuecke`,
 *    `wand` und `ausstattung` liegen obenauf. Der wird zum ersten Raum – wer
 *    sein Zimmer eingerichtet hat, findet es unverändert wieder.
 * 3. **Eine Liste.** Der heutige Fall. Zu viele Räume werden abgeschnitten
 *    (wer eines Tages kleiner wohnte), zu wenige aufgefüllt.
 *
 * Abgeschnitten wird am Ende und nicht am Anfang: Der vordere Raum ist der,
 * in dem das Bett steht.
 */
export function interiorAus(roh, stufe, kennt) {
  const formen = raeumeFuer(stufe);
  const alt = roh && typeof roh === 'object' && !Array.isArray(roh) ? roh : null;
  // Fall 2: flach. Zu erkennen daran, dass es keine Raumliste gibt, aber
  // etwas, das nach einem Raum aussieht.
  const liste = alt && Array.isArray(alt.raeume) ? alt.raeume
    : alt && (Array.isArray(alt.stuecke) || Array.isArray(alt.wand) || alt.ausstattung)
      ? [alt]
      : [];
  const raeume = [];
  for (let i = 0; i < formen.length; i++) {
    raeume.push(raumAus(liste[i], formen[i], kennt));
  }
  return { raeume: raeume };
}

/** Der Stand eines bestimmten Raums – nie undefined. */
export function raumStand(interior, index) {
  const liste = interior && Array.isArray(interior.raeume) ? interior.raeume : [];
  return liste[index | 0] || emptyRaum();
}

/* ---------------------------------------------------------------- Gruppen */

/**
 * Ein Teppich bindet zusammen, was darauf steht.
 *
 * Bis hierher war Einrichten eine Frage der ZAHL: Mehr Stücke, mehr Punkte,
 * und wo sie standen, war gleichgültig. Damit ist ein Zimmer mit acht
 * Stühlen an acht Wänden genauso viel wert wie eine Sitzgruppe.
 *
 * Jetzt zählt auch das Danebenstellen: Ein Tisch mit zwei Stühlen auf einem
 * Teppich ist eine **Gruppe**, und die gibt einen Zuschlag.
 *
 * Zwei Dinge sind daran Absicht:
 *
 * 1. **Nur flache Stücke binden.** Teppich, Matte, Trittsteine – was man
 *    unterlegt. Ein Tisch, der Stühle bindet, wäre dieselbe Mechanik mit
 *    mehr Regeln und weniger Bild.
 * 2. **Ein Teppich bindet höchstens drei.** Sonst wäre die beste Antwort ein
 *    Teppich mit zwanzig Stühlen darauf, und aus dem Einrichten würde ein
 *    Stapeln.
 */

/** Wie nah an einem flachen Stück etwas stehen muss, um dazuzugehören. */
export const GRUPPE_RADIUS = 78;

/** Was ein gebundenes Stück zusätzlich zählt. */
export const GRUPPE_BONUS = 2;

/** Wie viele Stücke ein einzelner Teppich binden kann. */
export const GRUPPE_MAX = 3;

/**
 * Die Gruppen im Zimmer.
 *
 * @returns {Array} je flachem Stück: { id, x, y, n } – n = gebundene Stücke
 */
export function gruppen(stuecke, getItem) {
  const liste = stuecke || [];
  const raus = [];
  for (let i = 0; i < liste.length; i++) {
    const unten = liste[i];
    const it = getItem(unten.id);
    if (!it || !it.flat) continue;
    let n = 0;
    for (let k = 0; k < liste.length && n < GRUPPE_MAX; k++) {
      if (k === i) continue;
      const oben = liste[k];
      const o = getItem(oben.id);
      if (!o || o.flat) continue;   // Teppich auf Teppich ist keine Gruppe
      const dx = oben.x - unten.x;
      const dy = oben.y - unten.y;
      if (dx * dx + dy * dy > GRUPPE_RADIUS * GRUPPE_RADIUS) continue;
      n++;
    }
    if (n > 0) raus.push({ id: unten.id, x: unten.x, y: unten.y, n: n });
  }
  return raus;
}

/** Was die Gruppen zusammen zusätzlich zählen. */
export function gruppenPunkte(stuecke, getItem) {
  const g = gruppen(stuecke, getItem);
  let summe = 0;
  for (let i = 0; i < g.length; i++) summe += g[i].n * GRUPPE_BONUS;
  return summe;
}
