/**
 * Der Besuch – ein Geist sieht sich dein Zimmer an.
 *
 * Das Einrichten hatte eine Lücke, und zwar am Ende: Der Charme deines
 * Zimmers ist eine Zahl, die **nur du siehst**. Man stellt einen Tisch hin,
 * legt einen Teppich darunter, hängt ein Bild auf – und niemand sagt je ein
 * Wort dazu. `interior.js` kennt die Kennung „Geist" kein einziges Mal; die
 * sieben waren noch nie in deinem Haus.
 *
 * **Er sagt einen Satz, nicht drei.** Ein Geist, der durchs Zimmer geht und
 * jedes Stück kommentiert, wäre eine Führung. Dieses Spiel hat weniger
 * Dialoge als seine Vorbilder, und das ist Absicht: Ein Satz zu EINEM Stück,
 * und der Rest ist, dass jemand da ist.
 *
 * **Er verlangt nichts.** Kein Auftrag, keine Wertung, keine Punktzahl. Wer
 * ein kahles Zimmer hat, bekommt keinen Tadel – er bekommt einen anderen
 * Satz, und der ist freundlich. Dieselbe Regel wie überall hier: nichts
 * verdirbt, nichts bestraft.
 *
 * **Er ist einfach da, wenn du hereinkommst.** Kein Klopfen, kein Öffnen,
 * kein Hereinbitten. Die ganze Choreografie einer Ankunft wäre Arbeit für
 * einen Moment, den man einmal sieht – und ein Geist, der vor der Tür wartet,
 * bis man ihn bemerkt, ist ein Geist, den man verpassen kann.
 */
import { dailyRng } from '../core/rng.js';

/**
 * Ab welcher Freundschaftsstufe jemand vorbeikommt.
 *
 * Nicht ab der ersten: Wer sich das Zimmer von jemandem ansieht, kennt ihn.
 * Stufe 3 heißt neun erledigte Bitten – da ist man über das Höfliche hinaus.
 */
export const FREUND_AB = 3;

/** Der frühestmögliche Tag. Vorher hat man noch gar kein Zimmer. */
export const FRUEHESTENS = 12;

/**
 * Das Fenster, in dem einer kommt.
 *
 * Zehn Tage statt sieben wie beim Wanderer. Er kommt in dein HAUS – das ist
 * mehr als ein Händler am Strand, und was zu oft kommt, ist kein Besuch
 * mehr, sondern ein Mitbewohner.
 *
 * Dieselbe Bauart wie beim Wanderer, und aus demselben gemessenen Grund:
 * Ein Tageswurf mit gleicher Häufigkeit ließ dort bis zu 66 Tage Lücke.
 * Gewürfelt wird nicht OB, sondern AN WELCHEM Tag des Fensters.
 */
export const FENSTER = 10;

/** Kommt an diesem Tag jemand? */
export function besuchAm(seed, tag) {
  if (!(tag >= FRUEHESTENS)) return false;
  const fenster = Math.floor((tag - FRUEHESTENS) / FENSTER);
  return tag === FRUEHESTENS + fenster * FENSTER + tagImFenster(seed, fenster);
}

function tagImFenster(seed, fenster) {
  return 1 + Math.floor(dailyRng(seed, fenster, 'besuch-fenster')() * (FENSTER - 1));
}

/** Der nächste Tag, an dem jemand kommt – ab `tag` (einschließlich). */
export function naechsterBesuch(seed, tag) {
  let t = Math.max(tag, FRUEHESTENS);
  for (let i = 0; i < FENSTER * 3; i++) {
    if (besuchAm(seed, t)) return t;
    t++;
  }
  return t;
}

/**
 * Wer heute kommt.
 *
 * Aus den Geistern, die nah genug stehen – wer, entscheidet der Tag und
 * nicht der Zufall des Augenblicks: Sonst käme beim zweiten Betreten des
 * Zimmers jemand anderes.
 *
 * @param {string[]} kandidaten Kennungen, aufsteigend sortiert
 */
export function gastFuer(seed, tag, kandidaten) {
  const liste = (kandidaten || []).slice().sort();
  if (!liste.length) return null;
  if (!besuchAm(seed, tag)) return null;
  return liste[Math.floor(dailyRng(seed, tag, 'besuch-wer')() * liste.length)];
}

/**
 * Was gesagt wird.
 *
 * Drei Lagen je Geist, und jede in seiner Stimme:
 *
 *   kahl    das Zimmer ist noch fast leer
 *   stueck  es steht etwas da – `%s` ist sein Name
 *   voll    es steht viel da
 *
 * Kein Satz wertet. „Kahl" heißt nicht „zu leer": Flämmchen findet Platz
 * gut, Nelly sieht schon, wo etwas hinkäme, Tobi denkt ans Bauen. Jeder
 * sieht dasselbe leere Zimmer und sagt etwas anderes darüber – das ist der
 * ganze Sinn davon, dass es sieben sind.
 */
export const SAETZE = {
  flamey: {
    kahl: 'Viel Platz. Gut für ein Feuer.',
    stueck: '%s. Das wärmt sicher.',
    voll: 'Warm hier. Ohne Feuer.',
  },
  mira: {
    kahl: 'Hier könnte etwas wachsen.',
    stueck: '%s ist schön. Steht gut.',
    voll: 'Es blüht ja richtig, bei dir drinnen.',
  },
  kiesel: {
    kahl: 'Aufgeräumt. Wie an Deck.',
    stueck: '%s. Gute Wahl.',
    voll: 'Voll wie eine Kajüte. Gefällt mir.',
  },
  bruno: {
    kahl: 'Weit. Wie eine Lichtung.',
    stueck: '%s. Hätte ich nicht gedacht.',
    voll: 'Dicht wie ein Unterholz. Nur gemütlicher.',
  },
  tobi: {
    kahl: 'Da ginge noch was. Sag Bescheid.',
    stueck: '%s hält gut. Hab ich nachgesehen.',
    voll: 'Alles steht fest. Ich hab geschaut.',
  },
  nelly: {
    kahl: 'Ich sehe schon, wo was hinkommt.',
    stueck: '%s. Genau da gehört es hin.',
    voll: 'Bei dir würde ich gern mal decken.',
  },
  wanda: {
    kahl: 'Still hier. Ich mag still.',
    stueck: '%s. Das hätte ich auch genommen.',
    voll: 'So viel auf einmal. Schön.',
  },
};

/** Ab wie vielen Stücken ein Zimmer „voll" ist – und bis wann „kahl". */
export const VOLL_AB = 8;
export const KAHL_BIS = 2;

/**
 * Der Satz zu dieser Lage.
 *
 * Reihenfolge: **kahl schlägt alles** (bei zwei Stücken über eines zu reden
 * wäre seltsam), dann das Stück, dann „voll". Ohne ein benennbares Stück
 * fällt es auf „voll" zurück – das kommt vor, wenn im Zimmer nur Dinge
 * stehen, die keinen Namen haben sollten.
 *
 * @param {string} spiritId
 * @param {object} lage {stuecke, stueckName}
 */
export function satzFuer(spiritId, lage) {
  const s = SAETZE[spiritId];
  if (!s) return '';
  const l = lage || {};
  const n = l.stuecke | 0;
  if (n <= KAHL_BIS) return s.kahl;
  if (l.stueckName) return s.stueck.replace('%s', l.stueckName);
  return s.voll;
}

/**
 * Welches Stück er anspricht.
 *
 * Das mit dem meisten Charme – das Beste, was dasteht. Bei Gleichstand
 * entscheidet die Kennung und nicht die Reihenfolge im Spielstand: Sonst
 * spräche er beim Neuladen über ein anderes Stück, und aus einer Bemerkung
 * würde ein Zufallsgenerator.
 *
 * @param {object[]} stuecke  [{itemId}]
 * @param {function} charmeVon  itemId → Zahl
 * @param {function} nameVon    itemId → Name
 */
export function bestesStueck(stuecke, charmeVon, nameVon) {
  const liste = stuecke || [];
  let beste = null;
  let bester = -1;
  for (let i = 0; i < liste.length; i++) {
    const id = liste[i] && liste[i].itemId;
    if (!id) continue;
    const c = charmeVon(id) | 0;
    if (c <= 0) continue;
    if (c > bester || (c === bester && id < beste)) {
      bester = c;
      beste = id;
    }
  }
  return beste ? { itemId: beste, name: nameVon(beste), charme: bester } : null;
}

/** Leerer Stand – wie `emptyWanderer` und `emptyFeste`. */
export function emptyBesuch() {
  return { tag: 0, wer: null, gesprochen: 0 };
}

/** Hat man heute schon mit ihm geredet? */
export function heuteGesprochen(stand, tag) {
  return !!(stand && stand.gesprochen === tag);
}

/** Der Stand aus einem Spielstand – was auch immer dort steht. */
export function besuchAus(roh) {
  if (!roh || typeof roh !== 'object') return emptyBesuch();
  return {
    tag: Number.isFinite(roh.tag) ? roh.tag | 0 : 0,
    wer: SAETZE[roh.wer] ? roh.wer : null,
    gesprochen: Number.isFinite(roh.gesprochen) ? roh.gesprochen | 0 : 0,
  };
}
