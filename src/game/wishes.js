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
import { SPIRITS } from './spirits.js';
import { randInt, randPick } from '../core/rng.js';

/** Wie viele Wünsche gleichzeitig offen sind. */
export const MAX_OFFEN = 3;

/**
 * Nach wie vielen Tagen ein UNANGETASTETER Wunsch zurückgezogen wird.
 *
 * Wünsche laufen bewusst nicht ab – ein Ort ist keine Bitte mit Frist. Aber
 * ohne jede Bewegung wären drei Wünsche, die einem nicht liegen, für immer
 * die einzigen drei: Die Liste füllt ja nur auf. Wer angefangen hat, behält
 * seinen Wunsch so lange er will; nur an dem, wo gar nichts steht, verliert
 * der Geist irgendwann das Interesse.
 */
export const GEDULD_TAGE = 12;

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
 * `test` bekommt Welt, Weltkoordinate und den Wunsch selbst und sagt ja oder
 * nein – mehr braucht es nicht, und alles, was hier geprüft wird, weiß das
 * Spiel schon.
 *
 * Den Wunsch braucht genau einer: `beiMir`. Er ist in Wahrheit SIEBEN Orte,
 * je einer bei jedem Geist, und macht aus einer Ortsangabe eine persönliche
 * Bitte – „Mira hätte gern etwas Grünes bei sich" ist etwas anderes als
 * „etwas Grünes im Wald". Damit verdoppelt ein einziger Eintrag fast die
 * Zahl der möglichen Wünsche.
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
  beiMir: {
    id: 'beiMir', name: 'bei ihm selbst', region: null,
    /** Der Name hängt am Geist – deshalb eine Funktion statt eines Wortes. */
    nameFuer: function (w) {
      const g = w && SPIRITS[w.spirit];
      return g ? 'bei ' + g.name : 'bei ihm selbst';
    },
    test: function (welt, x, y, w) {
      const g = w && welt.spiritEntity ? welt.spiritEntity(w.spirit) : null;
      if (!g) return false;
      const dx = g.x - x;
      const dy = g.y - y;
      return dx * dx + dy * dy <= 400 * 400;
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
  keine: { id: 'keine', name: '', charme: 0, stueck: 1, dazu: null },
  gemuetlich: {
    id: 'gemuetlich', name: 'Und ringsum sollte es gemütlich sein.',
    charme: 14, stueck: 1, dazu: null,
  },
  mehrere: {
    id: 'mehrere', name: 'Und nicht nur eins.',
    charme: 0, stueck: 3, dazu: null,
  },
  // Die vierte kommt erst später (siehe `DAZU_AB`): Sie verlangt ein Stück
  // einer ZWEITEN Sorte am selben Platz und ist damit die einzige, bei der
  // man zwei Dinge zusammendenken muss. Als vierte von Anfang an wäre sie
  // eine Hürde; als Steigerung ist sie der Grund, weiterzumachen.
  dazu: {
    id: 'dazu', name: 'Und $DAZU sollte dabei sein.',
    charme: 0, stueck: 1, dazu: true,
  },
};

export const ZUGAB_IDS = Object.keys(ZUGABEN);

/** Ab wie vielen erfüllten Wünschen die zweite Sorte dazukommt. */
export const DAZU_AB = 8;

/**
 * Was ein Wunsch verlangt – abhängig davon, wie viele man schon erfüllt hat.
 *
 * Die Forderung wird beim ANLEGEN in den Wunsch geschrieben, nicht bei jeder
 * Prüfung neu gerechnet. Sonst würde ein Wunsch, den man liegen lässt,
 * hinter dem Rücken teurer – und das wäre eine Strafe fürs Nachdenken.
 *
 * Die Steigerung ist flach und gedeckelt. Sie soll verhindern, dass der
 * fünfzigste Wunsch dieselbe Handbewegung ist wie der erste; sie soll nicht
 * dazu führen, dass irgendwann eine halbe Insel voll Deko nötig ist.
 */
export function forderungFuer(zugabeId, erfuellt) {
  const z = ZUGABEN[zugabeId] || ZUGABEN.keine;
  const n = erfuellt || 0;
  return {
    charme: z.charme ? Math.min(38, z.charme + Math.floor(n / 6) * 3) : 0,
    stueck: z.stueck > 1 ? Math.min(5, z.stueck + Math.floor(n / 14)) : 1,
    dazu: !!z.dazu,
  };
}

/** Die Forderung eines Wunsches – aus ihm selbst, mit Rückfall auf die Tabelle. */
export function forderung(w) {
  if (w && w.forderung) return w.forderung;
  return forderungFuer(w ? w.zugabe : 'keine', 0);
}

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

/** Wie ein Ort in einem Satz heißt – manche hängen am Geist. */
export function ortName(ortId, w) {
  const o = ORTE[ortId];
  if (!o) return 'irgendwo';
  return o.nameFuer ? o.nameFuer(w) : o.name;
}

/** Der ausgeschriebene Satz eines Wunsches. */
export function wunschText(w) {
  const liste = SAETZE[w.sorte] || SAETZE.sitz;
  const satz = liste[(w.satz || 0) % liste.length];
  let t = satz.replace('$ORT', ortName(w.ort, w));
  const zugabe = ZUGABEN[w.zugabe];
  // Als eigener Satz, nicht als Anhängsel: Der Grundsatz endet manchmal auf
  // ein Fragezeichen, und „…eine Laterne? – und nicht nur eins." liest sich
  // wie ein Formularfeld.
  if (zugabe && zugabe.name) {
    const zweite = SORTEN[w.dazu];
    t += ' ' + zugabe.name.replace('$DAZU', zweite ? zweite.name : 'noch etwas');
  }
  return t;
}

/** Die Kurzfassung für die Auftragskarte. */
export function wunschTitel(w) {
  const s = SORTEN[w.sorte];
  const kopf = s ? s.name.charAt(0).toUpperCase() + s.name.slice(1) : 'Ein Platz';
  return kopf + ' ' + ortName(w.ort, w);
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
 * Wie viele erfüllte Wünsche sich das Spiel merkt.
 *
 * Der Grund ist gemessen: Gemieden wurden anfangs nur die drei OFFENEN
 * Kombinationen, und damit kam die erste Wiederholung im Median schon beim
 * **elften** Wunsch, im schlechtesten Fall beim vierten. Von „gefühlt
 * endlos" ist das weit entfernt – nichts wirkt schneller ausgelutscht als
 * dieselbe Bitte, die man vorgestern erfüllt hat.
 *
 * Sechzehn ist knapp die Hälfte der Sorte-Ort-Paare: genug, dass sich nichts
 * kurzfristig wiederholt, und nicht so viel, dass am Ende nichts mehr übrig
 * bleibt, was der Bauplan zulässt.
 */
export const GEDAECHTNIS = 16;

/**
 * Der Schlüssel, unter dem ein Wunsch als „schon dagewesen" gilt.
 *
 * Bei ortsgebundenen Wünschen gehört der Geist dazu: „Ein Platz zum Sitzen
 * bei Mira" und derselbe bei Bruno sind zwei verschiedene Plätze auf zwei
 * verschiedenen Seiten der Insel. Über einen Kamm geschoren wären sie einer,
 * und das Gedächtnis würde die Hälfte der Abwechslung wegsperren, die
 * `beiMir` gerade erst gebracht hat.
 */
export function wunschKey(w) {
  const o = ORTE[w.ort];
  return w.sorte + ':' + w.ort + (o && o.nameFuer ? ':' + w.spirit : '');
}

/**
 * Ein neuer Wunsch.
 *
 * @param {object} welt     für die offenen Bereiche
 * @param {string} spirit   wer ihn äußert
 * @param {number} day      Inseltag
 * @param {function} rng
 * @param {object} belegt   gemiedene Kombinationen: { 'sitz:wasser': 1 }
 * @param {number} erfuellt wie viele schon erfüllt sind – treibt die Ansprüche
 */
export function wunschBauen(welt, spirit, day, rng, belegt, erfuellt) {
  const orte = orteFuer(welt);
  if (!orte.length) return null;
  const n = erfuellt || 0;
  // Erst mit Rücksicht auf das Gedächtnis suchen; findet sich nichts, lieber
  // eine Wiederholung als gar kein Wunsch. Eine leere Liste wäre schlimmer
  // als ein bekannter Platz.
  for (let runde = 0; runde < 2; runde++) {
    for (let versuch = 0; versuch < 20; versuch++) {
      const sorte = randPick(rng, SORT_IDS);
      const ort = randPick(rng, orte);
      if (runde === 0 && belegt
        && belegt[wunschKey({ sorte: sorte, ort: ort, spirit: spirit })]) continue;
      // Die vierte Zugabe kommt erst, wenn man den Dreh heraus hat.
      const moeglich = ['gemuetlich', 'mehrere'];
      if (n >= DAZU_AB) moeglich.push('dazu');
      const zugabe = rng() < 0.5 ? randPick(rng, moeglich) : 'keine';
      // Die zweite Sorte darf nicht dieselbe sein – „ein Sitzplatz, und ein
      // Sitzplatz dabei" wäre keine Aufgabe, sondern ein Tippfehler.
      let dazu = null;
      if (zugabe === 'dazu') {
        const andere = SORT_IDS.filter(function (id) { return id !== sorte; });
        dazu = randPick(rng, andere);
      }
      return {
        id: 'w' + day + '_' + Math.floor(rng() * 1e6),
        spirit: spirit,
        sorte: sorte,
        ort: ort,
        zugabe: zugabe,
        dazu: dazu,
        // Die Forderung wird HIER festgeschrieben, nicht bei jeder Prüfung
        // neu gerechnet: Sonst würde ein Wunsch, den man liegen lässt,
        // hinter dem Rücken teurer – eine Strafe fürs Nachdenken.
        forderung: forderungFuer(zugabe, n),
        satz: randInt(rng, 0, 3),
        day: day,
        done: false,
      };
    }
  }
  return null;
}

/**
 * Einen erfüllten Wunsch ins Gedächtnis schreiben.
 *
 * Eine Liste mit fester Länge, ältestes fliegt hinten raus – dieselbe
 * Mechanik wie beim Briefkasten.
 */
export function merken(liste, w) {
  const neu = (liste || []).concat([wunschKey(w)]);
  return neu.slice(Math.max(0, neu.length - GEDAECHTNIS));
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
  const soll = forderung(w);
  const leer = { erfuellt: false, charme: 0, stueck: 0, dabei: false, soll: soll };
  if (!sorte || !ort || !welt || !welt.entities) return leer;

  const passt = Object.create(null);
  for (let i = 0; i < sorte.items.length; i++) passt[sorte.items[i]] = 1;
  // Die zweite Sorte, falls der Wunsch eine verlangt.
  const zweite = Object.create(null);
  if (soll.dazu && SORTEN[w.dazu]) {
    const z = SORTEN[w.dazu];
    for (let i = 0; i < z.items.length; i++) zweite[z.items[i]] = 1;
  }

  let besteCharme = 0;
  let besteStueck = 0;
  let besteDabei = false;
  for (let i = 0; i < welt.entities.length; i++) {
    const e = welt.entities[i];
    if (e.gone || e.kind !== 'decor' || !passt[e.itemId]) continue;
    if (!ort.test(welt, e.x, e.y, w)) continue;

    // Nachbarschaft: Charme aller Deko ringsum, wie viele Stücke DIESER
    // Sorte dabei sind – und ob die zweite Sorte vertreten ist.
    const nah = welt.queryNear(e.x, e.y, ZUGABE_RADIUS);
    let charme = 0;
    let stueck = 0;
    let dabei = false;
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
      if (zweite[d.itemId]) dabei = true;
    }
    if (charme > besteCharme) besteCharme = charme;
    if (stueck > besteStueck) besteStueck = stueck;
    if (dabei) besteDabei = true;
    if (charme >= soll.charme && stueck >= soll.stueck && (!soll.dazu || dabei)) {
      return { erfuellt: true, charme: charme, stueck: stueck, dabei: dabei, soll: soll };
    }
  }
  return {
    erfuellt: false, charme: besteCharme, stueck: besteStueck,
    dabei: besteDabei, soll: soll,
  };
}

/**
 * Erfüllt DIESER Gegenstand an DIESER Stelle einen der offenen Wünsche?
 *
 * Für die Zeile beim Aufstellen. Ohne sie ist ein Wunsch ein Ratespiel:
 * „am Wasser" heißt in Zahlen 150 Pixel, und wer die Bank zweihundert
 * daneben hinstellt, sieht nichts passieren und erfährt nicht, warum. Das
 * ist der Unterschied zwischen einer Aufgabe und einem Suchbild.
 *
 * Geprüft wird nur SORTE und ORT, nicht die Zugabe: Ob ringsum genug
 * Gemütlichkeit steht, sieht man erst, wenn das Stück steht – und die Zahl
 * dazu steht im Aufgabenfenster.
 *
 * @returns {object|null} der passende Wunsch, oder null
 */
export function wunschHier(offen, itemId, x, y, welt) {
  if (!offen || !itemId) return null;
  for (let i = 0; i < offen.length; i++) {
    const w = offen[i];
    const sorte = SORTEN[w.sorte];
    const ort = ORTE[w.ort];
    if (!sorte || !ort) continue;
    if (sorte.items.indexOf(itemId) < 0) continue;
    if (!ort.test(welt, x, y, w)) continue;
    return w;
  }
  return null;
}

/**
 * Passt der Gegenstand zu einem Wunsch, steht aber am falschen Ort?
 *
 * Die nützlichere Hälfte der Auskunft: „Diese Bank ist richtig, die Stelle
 * nicht" schickt einen los; „hier passt nichts" lässt einen stehen.
 *
 * @returns {object|null} der Wunsch, dessen Sorte passt
 */
export function wunschSorteHier(offen, itemId) {
  if (!offen || !itemId) return null;
  for (let i = 0; i < offen.length; i++) {
    const sorte = SORTEN[offen[i].sorte];
    if (sorte && sorte.items.indexOf(itemId) >= 0) return offen[i];
  }
  return null;
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
export function wunschLohn(w, erfuellt) {
  const zugabe = ZUGABEN[w.zugabe] || ZUGABEN.keine;
  const extra = (zugabe.charme > 0 ? 1 : 0) + (zugabe.stueck > 1 ? 1 : 0);
  // Der Lohn wächst mit der Zahl der schon erfüllten Wünsche.
  //
  // Das ist kein Bonbon, sondern nötig: Ein Tag Bitten bringt spät im Spiel
  // rund 1 800 Münzen, und die Wünsche sollen ab da die Hauptbeschäftigung
  // sein. Ein fester Lohn von 260 wäre dann Kleingeld für mehr Arbeit – man
  // würde sie liegen lassen und weiter Bitten abarbeiten.
  //
  // Gedeckelt beim Dreifachen, erreicht nach 25 Wünschen: Ohne Deckel wäre
  // der hundertste Wunsch mehr wert als alles davor zusammen.
  const stufe = 1 + Math.min(2, (erfuellt || 0) * 0.08);
  return {
    coins: Math.round((260 + extra * 140) * stufe),
    ember: Math.round((12 + extra * 6) * stufe),
    items: [{ id: 'gem', n: (erfuellt || 0) >= 12 ? 2 : 1 }],
  };
}

export function emptyWishes() {
  return { offen: [], erfuellt: 0, letzte: [] };
}

/**
 * Wie die Insel einen nennt.
 *
 * Kein Rang mit Rechten, nur ein Wort – aber eines, das mitwächst. Bei
 * einer Beschäftigung, die nie fertig wird, ist das die einzige Form von
 * Fortschritt, die man aufschreiben kann, ohne sie zu beenden. Die letzte
 * Stufe kommt bewusst spät und heißt bewusst nicht „Meisterin": Es bleibt
 * ein Ort zum Wohnen, keine Rangliste.
 */
export const RAENGE = [
  { ab: 0, name: 'Zugezogen' },
  { ab: 3, name: 'Wer etwas hinstellt' },
  { ab: 8, name: 'Inselgärtnerin' },
  { ab: 16, name: 'Wer weiß, wo was hingehört' },
  { ab: 30, name: 'Die Hand der Insel' },
  { ab: 50, name: 'Hier ist alles an seinem Platz' },
];

export function rangFuer(erfuellt) {
  let r = RAENGE[0];
  for (let i = 0; i < RAENGE.length; i++) if ((erfuellt || 0) >= RAENGE[i].ab) r = RAENGE[i];
  return r;
}

/** Wie viele Wünsche bis zum nächsten Wort – oder null auf der letzten Stufe. */
export function bisZumNaechstenRang(erfuellt) {
  for (let i = 0; i < RAENGE.length; i++) {
    if ((erfuellt || 0) < RAENGE[i].ab) return RAENGE[i].ab - (erfuellt || 0);
  }
  return null;
}

/** Wie viele Wünsche insgesamt erfüllt wurden. */
export function wunschZahl(state) {
  return (state && state.erfuellt) || 0;
}
