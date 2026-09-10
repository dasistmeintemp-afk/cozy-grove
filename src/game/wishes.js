/**
 * Wunschplätze – das Spiel nach dem Spiel.
 *
 * Bei hundert Prozent ist die Insel bunt, alle Meilensteine sind erreicht,
 * und die Geister haben nichts mehr zu wollen, was mit Farbe zu tun hätte.
 * Der Abschluss macht daraus einen Abend (siehe `finale.js`) – aber danach
 * läuft nur noch der Tagesbetrieb weiter: dieselben Bitten, dieselbe Runde.
 *
 * Hier steht das, was danach kommt und nicht aufhört.
 *
 * **Die Idee.** Die Geister hören auf, Farbe zu brauchen, und fangen an,
 * sich ORTE zu wünschen: einen Platz zum Sitzen mit Blick aufs Wasser. Licht
 * am Strand, wo nachts nichts leuchtet. Etwas Grünes oben auf den Klippen.
 * Erfüllt wird ein Wunsch nicht durch Abgeben, sondern durch AUFSTELLEN –
 * und das Ergebnis bleibt stehen, wenn er erfüllt ist.
 *
 * **Warum das.** Das Spiel hat 26 aufstellbare Stücke und einen Katalog, und
 * Einrichten war bis hierher ein Lager: Man besitzt Deko, man stellt sie
 * irgendwo hin, fertig. Ein Wunsch macht daraus eine Aufgabe mit einer
 * richtigen und vielen falschen Antworten – und weil er aus Bausteinen
 * zusammengesetzt wird statt geschrieben, gehen sie nie aus.
 *
 * **Woraus ein Wunsch besteht.** Drei Teile, alle aus Dingen, die das Spiel
 * ohnehin weiß:
 *
 *   SORTE      welche Art Deko – ein Sitzplatz, ein Licht, etwas Grünes …
 *   ORT        wo – am Wasser, im Wald, auf den Klippen, beim Lager …
 *   ZUGABE     was noch dazugehört – Gemütlichkeit ringsum, oder mehrere
 *              Stücke, oder gar nichts
 *
 * Aus 6 Sorten × 7 Orten × 3 Zugaben kommen über hundert verschiedene
 * Wünsche, ohne dass einer davon von Hand geschrieben werden müsste. Der
 * TEXT dagegen ist geschrieben, je Sorte und Ort einer – ein Satz aus einem
 * Baukasten liest sich sonst wie einer.
 *
 * **Was ein Wunsch nicht ist.** Keine Frist, keine Strafe, kein Abbau. Wer
 * die Deko wieder wegnimmt, verliert die Belohnung nicht – der Wunsch war
 * erfüllt, und das bleibt er. Sonst wäre Einrichten ein Käfig statt eines
 * Spiels.
 */
import { getItem, CAT } from './items.js';
import { randInt, randPick } from '../core/rng.js';

/** Wie viele Wünsche gleichzeitig offen sind. */
export const MAX_OFFEN = 3;

/**
 * Ab wann sich die Geister Orte wünschen.
 *
 * Bewusst NICHT erst bei hundert Prozent: Wer das Spiel zum ersten Mal
 * durchspielt, soll die Sorte Aufgabe schon kennen, bevor sie die einzige
 * ist. Ab der Hälfte, zusammen mit der Stillen Insel – da steht genug Deko
 * zur Verfügung, dass man wirklich wählen kann.
 */
export const WUNSCH_MEILENSTEIN = 'insel';

/**
 * Die Sorten.
 *
 * Eine Sorte ist eine Gruppe, kein einzelnes Stück: „ein Platz zum Sitzen"
 * lässt sich mit einer Bank, einem Stuhl, einer Hängematte oder der Schaukel
 * erfüllen. Ein Wunsch nach genau einem Gegenstand wäre eine Einkaufsliste;
 * ein Wunsch nach einer Sorte ist eine Entscheidung.
 */
export const SORTEN = {
  sitz: {
    id: 'sitz', name: 'ein Platz zum Sitzen',
    items: ['bench', 'chair', 'hammock', 'swing'],
    icon: 'icon_bench',
  },
  licht: {
    id: 'licht', name: 'Licht',
    items: ['lantern', 'moonlamp', 'firebowl', 'stringlights', 'paperlamp'],
    icon: 'icon_lantern',
  },
  gruen: {
    id: 'gruen', name: 'etwas Grünes',
    items: ['flowerbed', 'planter', 'trellis'],
    icon: 'icon_flowerbed',
  },
  tiere: {
    id: 'tiere', name: 'etwas für die Tiere',
    items: ['birdhouse', 'birdbath', 'pond', 'beehive', 'bowl'],
    icon: 'icon_birdhouse',
  },
  weg: {
    id: 'weg', name: 'ein Weg',
    items: ['path_tile', 'signpost', 'fence'],
    icon: 'icon_path_tile',
  },
  tisch: {
    id: 'tisch', name: 'ein gedeckter Tisch',
    items: ['table', 'mat', 'rug', 'windchime'],
    icon: 'icon_table',
  },
};

export const SORT_IDS = Object.keys(SORTEN);

/**
 * Die Orte.
 *
 * `region` ist die Bereichsnummer aus `worldgen.js` oder null für „überall".
 * `test` bekommt Welt und Weltkoordinate und sagt ja oder nein – mehr braucht
 * es nicht, und alles, was hier geprüft wird, weiß das Spiel schon.
 */
export const ORTE = {
  wasser: {
    id: 'wasser', name: 'am Wasser', region: null,
    test: function (welt, x, y) { return nahWasser(welt, x, y, 150); },
  },
  wald: {
    id: 'wald', name: 'im Wald', region: 1,
    test: function (welt, x, y) { return welt.regionAtPixel(x, y) === 1; },
  },
  klippen: {
    id: 'klippen', name: 'oben an den Klippen', region: 2,
    test: function (welt, x, y) { return welt.regionAtPixel(x, y) === 2; },
  },
  insel: {
    id: 'insel', name: 'drüben auf der Stillen Insel', region: 3,
    test: function (welt, x, y) { return welt.regionAtPixel(x, y) === 3; },
  },
  lager: {
    id: 'lager', name: 'beim Lagerfeuer', region: 0,
    test: function (welt, x, y) {
      const f = welt.campfire;
      if (!f) return false;
      const dx = f.x - x;
      const dy = f.y - y;
      return dx * dx + dy * dy <= 420 * 420;
    },
  },
  zuhause: {
    id: 'zuhause', name: 'bei deinem Zuhause', region: null,
    test: function (welt, x, y) {
      const h = welt.tent;
      if (!h) return false;
      const dx = h.x - x;
      const dy = h.y - y;
      return dx * dx + dy * dy <= 380 * 380;
    },
  },
  abseits: {
    id: 'abseits', name: 'weit weg von allem', region: null,
    test: function (welt, x, y) {
      const f = welt.campfire;
      if (!f) return false;
      const dx = f.x - x;
      const dy = f.y - y;
      return dx * dx + dy * dy >= 1600 * 1600;
    },
  },
};

export const ORT_IDS = Object.keys(ORTE);

/** Liegt in Reichweite Wasser? */
function nahWasser(welt, x, y, r) {
  if (!welt || !welt.waterAt) return false;
  // Im Kreuz abtasten statt Kachel für Kachel: Für „Blick aufs Wasser"
  // reicht das, und es ist ein Bruchteil der Arbeit.
  for (let d = 32; d <= r; d += 32) {
    if (welt.waterAt(x + d, y) || welt.waterAt(x - d, y)) return true;
    if (welt.waterAt(x, y + d) || welt.waterAt(x, y - d)) return true;
    if (welt.waterAt(x + d * 0.7, y + d * 0.7)) return true;
    if (welt.waterAt(x - d * 0.7, y + d * 0.7)) return true;
    if (welt.waterAt(x + d * 0.7, y - d * 0.7)) return true;
    if (welt.waterAt(x - d * 0.7, y - d * 0.7)) return true;
  }
  return false;
}

/**
 * Die Zugaben.
 *
 * Ohne sie wäre jeder Wunsch mit einem einzigen Stück erledigt, und das
 * wäre nach dem dritten Mal keine Aufgabe mehr. `charme` verlangt, dass es
 * ringsum gemütlich ist – dieselbe Rechnung wie bei den Geistern –, `stueck`
 * verlangt mehrere Stücke derselben Sorte.
 */
export const ZUGABEN = {
  keine: { id: 'keine', name: '', charme: 0, stueck: 1 },
  gemuetlich: { id: 'gemuetlich', name: 'Und ringsum sollte es gemütlich sein.', charme: 14, stueck: 1 },
  mehrere: { id: 'mehrere', name: 'Und nicht nur eins.', charme: 0, stueck: 3 },
};

export const ZUGAB_IDS = Object.keys(ZUGABEN);

/** Wie weit um ein Stück herum die Zugabe zählt. */
export const ZUGABE_RADIUS = 260;

/**
 * Die Sätze.
 *
 * Ein Wunsch ist zusammengesetzt, sein Text ist es nicht: „ein Platz zum
 * Sitzen im Wald" wäre grammatisch richtig und läse sich wie eine
 * Datenbankzeile. Je Sorte gibt es deshalb ein paar ganze Sätze, in die der
 * Ort eingesetzt wird – und der Ort bringt seine eigene Wendung mit.
 */
const SAETZE = {
  sitz: [
    'Ich hätte gern einen Platz zum Sitzen $ORT.',
    'Es fehlt etwas zum Sitzen $ORT.',
  ],
  licht: [
    'Nachts ist es dunkel $ORT. Ein Licht wäre schön.',
    'Es fehlt ein Licht $ORT.',
  ],
  gruen: [
    'Es wächst zu wenig $ORT.',
    'Etwas Grünes $ORT würde alles verändern.',
  ],
  tiere: [
    'Für die Vögel ist nichts da $ORT.',
    'Es fehlt etwas für die Vögel $ORT.',
  ],
  weg: [
    'Es fehlt ein Weg $ORT.',
    'Es fehlt eine Spur $ORT, damit man weiß, wo es langgeht.',
  ],
  tisch: [
    'Etwas Gedecktes wäre schön $ORT.',
    'Es fehlt eine Stelle $ORT, an der man gern verweilt.',
  ],
};

/** Der ausgeschriebene Satz eines Wunsches. */
export function wunschText(w) {
  const ort = ORTE[w.ort];
  const liste = SAETZE[w.sorte] || SAETZE.sitz;
  const satz = liste[(w.satz || 0) % liste.length];
  let t = satz.replace('$ORT', ort ? ort.name : 'irgendwo');
  const zugabe = ZUGABEN[w.zugabe];
  // Als eigener Satz, nicht als Anhängsel: Der Grundsatz endet manchmal auf
  // ein Fragezeichen, und „…eine Laterne? – und nicht nur eins." liest sich
  // wie ein Formularfeld.
  if (zugabe && zugabe.name) t += ' ' + zugabe.name;
  return t;
}

/** Die Kurzfassung für die Auftragskarte. */
export function wunschTitel(w) {
  const s = SORTEN[w.sorte];
  const o = ORTE[w.ort];
  const kopf = s ? s.name.charAt(0).toUpperCase() + s.name.slice(1) : 'Ein Platz';
  return kopf + ' ' + (o ? o.name : '');
}

export function wunschIcon(w) {
  const s = SORTEN[w.sorte];
  return s ? s.icon : 'icon_flowerbed';
}

/**
 * Welche Orte gerade überhaupt in Frage kommen.
 *
 * Ein Wunsch nach den Klippen, bevor die Brücke steht, ist derselbe Fehler
 * wie die Feder ohne Quelle: eine Aufgabe, die man nicht erfüllen kann.
 */
export function orteFuer(welt) {
  return ORT_IDS.filter(function (id) {
    const o = ORTE[id];
    if (o.region == null) return true;
    return welt.isUnlocked ? welt.isUnlocked(o.region) : true;
  });
}

/**
 * Ein neuer Wunsch.
 *
 * @param {object} welt   für die offenen Bereiche
 * @param {string} spirit wer ihn äußert
 * @param {number} day    Inseltag
 * @param {function} rng
 * @param {object} belegt schon vergebene Kombinationen: { 'sitz:wasser': 1 }
 */
export function wunschBauen(welt, spirit, day, rng, belegt) {
  const orte = orteFuer(welt);
  if (!orte.length) return null;
  for (let versuch = 0; versuch < 12; versuch++) {
    const sorte = randPick(rng, SORT_IDS);
    const ort = randPick(rng, orte);
    if (belegt && belegt[sorte + ':' + ort]) continue;
    const zugabe = rng() < 0.45 ? randPick(rng, ['gemuetlich', 'mehrere']) : 'keine';
    return {
      id: 'w' + day + '_' + Math.floor(rng() * 1e6),
      spirit: spirit,
      sorte: sorte,
      ort: ort,
      zugabe: zugabe,
      satz: randInt(rng, 0, 3),
      day: day,
      done: false,
    };
  }
  return null;
}

/**
 * Ist der Wunsch erfüllt?
 *
 * Gesucht wird ein Stück der richtigen Sorte, das am richtigen Ort steht und
 * dessen Nachbarschaft die Zugabe erfüllt. Ein einziges genügt – der Wunsch
 * ist ein Platz, keine Zählung.
 *
 * @param {object} w    der Wunsch
 * @param {object} welt
 * @returns {{erfuellt: boolean, charme: number, stueck: number}}
 */
export function pruefeWunsch(w, welt) {
  const sorte = SORTEN[w.sorte];
  const ort = ORTE[w.ort];
  const zugabe = ZUGABEN[w.zugabe] || ZUGABEN.keine;
  const leer = { erfuellt: false, charme: 0, stueck: 0 };
  if (!sorte || !ort || !welt || !welt.entities) return leer;

  const passt = Object.create(null);
  for (let i = 0; i < sorte.items.length; i++) passt[sorte.items[i]] = 1;

  let besteCharme = 0;
  let besteStueck = 0;
  for (let i = 0; i < welt.entities.length; i++) {
    const e = welt.entities[i];
    if (e.gone || e.kind !== 'decor' || !passt[e.itemId]) continue;
    if (!ort.test(welt, e.x, e.y)) continue;

    // Nachbarschaft: Charme aller Deko ringsum, und wie viele Stücke DIESER
    // Sorte dabei sind.
    const nah = welt.queryNear(e.x, e.y, ZUGABE_RADIUS);
    let charme = 0;
    let stueck = 0;
    const r2 = ZUGABE_RADIUS * ZUGABE_RADIUS;
    for (let k = 0; k < nah.length; k++) {
      const d = nah[k];
      if (d.gone || d.kind !== 'decor' || !d.itemId) continue;
      const dx = d.x - e.x;
      const dy = d.y - e.y;
      if (dx * dx + dy * dy > r2) continue;
      const item = getItem(d.itemId);
      if (item && item.cat === CAT.DECOR) charme += item.charm || 1;
      if (passt[d.itemId]) stueck++;
    }
    if (charme > besteCharme) besteCharme = charme;
    if (stueck > besteStueck) besteStueck = stueck;
    if (charme >= zugabe.charme && stueck >= zugabe.stueck) {
      return { erfuellt: true, charme: charme, stueck: stueck };
    }
  }
  return { erfuellt: false, charme: besteCharme, stueck: besteStueck };
}

/**
 * Was ein erfüllter Wunsch einbringt.
 *
 * Deutlich mehr als eine Tagesbitte, denn er kostet Deko, die Geld gekostet
 * hat, und er belegt einen Platz auf Dauer. Die Zugabe zahlt sich aus – ein
 * Wunsch mit „ringsum gemütlich" ist mehr Arbeit als einer ohne.
 *
 * Und er gibt ETWAS ZUM AUFSTELLEN zurück, nicht nur Münzen: Wer Deko
 * verbaut, soll Deko bekommen, sonst versiegt der Nachschub genau da, wo er
 * gebraucht wird.
 */
export function wunschLohn(w) {
  const zugabe = ZUGABEN[w.zugabe] || ZUGABEN.keine;
  const extra = (zugabe.charme > 0 ? 1 : 0) + (zugabe.stueck > 1 ? 1 : 0);
  return {
    coins: 260 + extra * 140,
    ember: 12 + extra * 6,
    items: [{ id: 'gem', n: 1 }],
  };
}

export function emptyWishes() {
  return { offen: [], erfuellt: 0 };
}

/** Wie viele Wünsche insgesamt erfüllt wurden. */
export function wunschZahl(state) {
  return (state && state.erfuellt) || 0;
}
