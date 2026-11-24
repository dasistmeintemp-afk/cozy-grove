/**
 * Innenorte – Orte auf der Insel, in die man hineingehen kann.
 *
 * Das Hausinnere gab es schon, und es ist bewusst ein Sonderfall: ein Raum,
 * den man EINRICHTET. Was fehlte, war das andere Innen – die Höhle in der
 * Klippe, der Mahlboden der Mühle. Orte, die man betritt, weil dort etwas
 * ist, und nicht, weil man dort etwas hinstellt.
 *
 * **Warum ein eigenes Modul und nicht `interior.js`.** Die beiden haben fast
 * nichts gemeinsam außer der Tatsache, dass man drinnen steht. Im Zimmer
 * zählt Gemütlichkeit, es gibt Wandplätze, Abstandsregeln, Ausstattungen und
 * vier Ausbaustufen. In einer Höhle gibt es nichts davon; dort stehen Dinge,
 * wo sie stehen, und man schlägt sie ab. Die Regeln des Zimmers in die Höhle
 * zu zwingen hätte beide schlechter gemacht.
 *
 * **Was sie sich dagegen teilen: den Weg auf den Bildschirm.** Der ganze
 * Raum ist immer zu sehen, es gibt keine Kamera, keinen Kachelboden und kein
 * Wetter – genau wie im Zimmer. Deshalb läuft ein Innenort durch dieselbe
 * Zeichenkette (`drawInterior`) und durch dieselbe Bewegung. Nur was
 * DRINSTEHT, kommt von hier.
 *
 * **Der Inhalt hängt an der Insel, nicht am Zufall des Augenblicks.** Eine
 * Höhle, die bei jedem Besuch anders aussieht, ist kein Ort. Die Dinge
 * stehen deshalb an Plätzen, die aus dem Inselwurf berechnet werden – wer
 * sich merkt, wo die Geode lag, findet sie morgen wieder dort.
 */
import { makeRng } from '../core/rng.js';

/**
 * Wie groß ein Innenort ist, in Bildpunkten.
 *
 * Dieselbe Bedingung wie beim Zimmer: Der Ort muss ganz auf eine normale
 * Zeichenfläche passen. `wand` ist die gemalte Höhe oben – Felswand oder
 * Bretterwand –, sie gehört nicht zum begehbaren Boden.
 */
export const INNENORTE = [
  {
    id: 'hoehle',
    name: 'Die Höhle',
    w: 780, h: 480, wand: 150,
    /**
     * Wie dunkel es hier ist, über die Grundhelligkeit hinaus.
     *
     * Im Zimmer wird es nie richtig dunkel, weil dort nichts Pflicht sein
     * soll. In einer Höhle ist das Gegenteil richtig: Dunkelheit IST der
     * Ort. Nur eben nicht so dunkel, dass man ohne Laterne nichts findet –
     * die Wände leuchten schwach, und das muss reichen.
     */
    dunkel: 0.46,
    hinweis: 'Höhle betreten',
  },
  {
    id: 'muehle',
    name: 'Die Mühle',
    w: 720, h: 440, wand: 185,
    dunkel: 0.12,
    hinweis: 'Mühle betreten',
  },
];

export const INNENORT_IDS = INNENORTE.map(function (o) { return o.id; });

export function innenOrtFuer(id) {
  for (let i = 0; i < INNENORTE.length; i++) {
    if (INNENORTE[i].id === id) return INNENORTE[i];
  }
  return null;
}

/**
 * Wo der Ausgang liegt – unten in der Mitte, wie die Haustür.
 *
 * Eine Höhle, deren Ausgang woanders liegt als die Tür jedes anderen
 * Innenraums, ist nur ein Rätsel ohne Lösung. Dass es IMMER unten in der
 * Mitte hinausgeht, ist die Art von Regel, die man nach dem ersten Mal nie
 * wieder nachschlagen muss.
 */
/**
 * Breiter als die Figur.
 *
 * Mit 110 Punkten stand Seli beim Hineingehen genau davor und verdeckte
 * den Bogen vollständig – im Bild war kein Ausgang zu sehen, nur eine
 * Figur mit Hut. Ein Ausgang, den man erst findet, wenn man weggeht,
 * ist keiner.
 */
export const AUSGANG_BREITE = 156;
export const AUSGANG_TIEFE = 62;

export function ausgangFuer(ort) {
  return { x: Math.round(ort.w / 2 - AUSGANG_BREITE / 2), w: AUSGANG_BREITE };
}

/** Steht sie im Ausgang? */
export function amAusgang(x, y, ort) {
  const a = ausgangFuer(ort);
  return y > ort.h - AUSGANG_TIEFE && x > a.x - 20 && x < a.x + a.w + 20;
}

/** Der Rand, den der Boden ringsum frei lässt. */
export const ORT_RAND = 26;

/** Liegt der Punkt auf dem begehbaren Boden? */
export function imOrt(x, y, ort) {
  return x > ORT_RAND && x < ort.w - ORT_RAND
    && y > ORT_RAND && y < ort.h - ORT_RAND;
}

/**
 * Was in einem Innenort steht.
 *
 * Die Einträge nennen eine Objektart aus `entities.js` – `rock_ore`,
 * `mushroom` und so weiter. Das ist Absicht und spart die halbe Arbeit:
 * Werkzeug, Zahl der Schläge, Ausbeute und Nachwachsdauer stehen dort schon,
 * und ein Erz in der Höhle verhält sich damit genau wie eins am Hang. Eine
 * zweite Tabelle daneben wäre eine zweite Wahrheit.
 *
 * **Warum fest verteilt und nicht gestreut.** Ein Innenort ist klein genug,
 * dass man ihn sich merkt. Gestreute Plätze hätten ihn zu einem Raum
 * gemacht, in dem jedes Mal irgendwo irgendwas liegt – und genau das ist
 * der Unterschied zwischen einem Ort und einer Kiste.
 */
const INHALT = {
  /**
   * Die Höhle.
   *
   * Die festen Brocken liegen weit auseinander, und zwar gemessen: Eine
   * Prüfung verlangt zwischen je zweien mehr als ihre beiden Sperrkreise
   * plus eine Figurenbreite. Beim ersten Entwurf standen Erz und Geode
   * 93 Punkte auseinander – zusammen eine Mauer, durch die man nicht
   * hindurchkommt, und in einem Raum ohne Wegfindung steht man dann fest.
   *
   * Erz und Geode gehören deshalb an die Ränder, das Weiche in die Mitte.
   */
  hoehle: [
    /**
     * Sechs feste Brocken, auf einem weiten Raster.
     *
     * Das ist keine Gestaltungslaune, sondern eine gemessene Grenze: Eine
     * Prüfung verlangt zwischen je zwei festen Dingen mehr als ihre
     * beiden Sperrkreise plus eine Figurenbreite. Beim zweiten Entwurf
     * waren es acht Brocken, und zwei davon standen 97 Punkte
     * auseinander – zusammen eine Mauer. In einem Raum ohne Wegfindung
     * steht man dann fest, und der einzige Ausgang ist dahinter.
     *
     * Lieber sechs Dinge, an denen man vorbeikommt, als acht, zwischen
     * denen man klemmt.
     */
    { kind: 'kristallader', x: 0.08, y: 0.14 },
    { kind: 'rock_ore', x: 0.36, y: 0.10 },
    { kind: 'rock_ore', x: 0.64, y: 0.14 },
    // Die Geode ist das Stück, wegen dem man wiederkommt – eine je
    // Höhle, seitlich hinten, wo man sie erst beim zweiten Blick sieht.
    { kind: 'rock_geode', x: 0.92, y: 0.22 },
    { kind: 'kristallader', x: 0.14, y: 0.52 },
    { kind: 'rock_granite', x: 0.86, y: 0.60 },
    // Und das Weiche dazwischen – darüber läuft man hinweg.
    { kind: 'leuchtmoos', x: 0.46, y: 0.40 },
    { kind: 'leuchtmoos', x: 0.08, y: 0.80 },
    { kind: 'leuchtmoos', x: 0.90, y: 0.88 },
    { kind: 'mushroom', x: 0.24, y: 0.86 },
    { kind: 'mushroom', x: 0.40, y: 0.92 },
    { kind: 'mushroom', x: 0.66, y: 0.46 },
  ],
  muehle: [
    // In der Mühle wird nichts abgebaut – hier liegt, was ein Müller
    // liegen lässt. Deshalb nur Kleinkram, und der wächst täglich nach.
    { kind: 'mehlsack', x: 0.14, y: 0.74 },
    { kind: 'mehlsack', x: 0.30, y: 0.88 },
    { kind: 'mehlsack', x: 0.86, y: 0.84 },
    { kind: 'herb', x: 0.12, y: 0.42 },
    { kind: 'feather', x: 0.70, y: 0.30 },
  ],
};

/**
 * Die Dinge eines Innenortes, einmal berechnet.
 *
 * Der Inselwurf geht mit ein, damit zwei Höhlen auf derselben Insel nicht
 * Punkt für Punkt gleich aussehen – die Plätze wackeln ein wenig, die
 * Reihenfolge bleibt.
 */
export function inhaltFuer(ortId, seed) {
  const ort = innenOrtFuer(ortId);
  const liste = INHALT[ortId] || [];
  if (!ort) return [];
  const rng = makeRng(seed * 31 + ortId.length * 7717);
  const raus = [];
  for (let i = 0; i < liste.length; i++) {
    const e = liste[i];
    const bx = ORT_RAND + e.x * (ort.w - ORT_RAND * 2);
    const by = ORT_RAND + e.y * (ort.h - ORT_RAND * 2);
    raus.push({
      id: ortId + '_' + i,
      kind: e.kind,
      // Nur ein kleiner Versatz. Zuerst waren es 26 Punkte, und damit
      // konnten zwei Brocken im ungünstigen Wurf 46 Punkte näher
      // zusammenrücken als geplant – genug, um die Lücke zwischen ihnen
      // zu schließen. Der Abstand ist das Wichtigere.
      x: Math.round(bx + (rng() - 0.5) * 11),
      y: Math.round(by + (rng() - 0.5) * 9),
      hp: 0,
      gone: false,
      respawnDay: 0,
    });
  }
  return raus;
}

/** Der leere Stand eines Innenortes im Spielstand. */
export function emptyInnenorte() {
  return Object.create(null);
}

/**
 * Was vom Innenort im Spielstand landet.
 *
 * Nur das Veränderliche: was abgebaut wurde und wann es wiederkommt. Die
 * Plätze stehen in der Tabelle oben und werden nie gespeichert – sonst
 * würde ein alter Spielstand eine neue Höhle in alter Form festhalten.
 */
export function innenorteAus(roh) {
  const raus = emptyInnenorte();
  if (!roh || typeof roh !== 'object') return raus;
  for (const k in roh) {
    const e = roh[k];
    if (!e || typeof e !== 'object') continue;
    raus[k] = {
      gone: !!e.gone,
      respawnDay: Number(e.respawnDay) || 0,
      hp: Number(e.hp) || 0,
    };
  }
  return raus;
}
