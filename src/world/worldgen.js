/**
 * Inselgenerierung.
 *
 * Die Insel besteht aus vier Bereichen, die durch natürliche Hindernisse
 * getrennt sind – das ergibt den Fortschritt, ohne dass irgendwo eine
 * unsichtbare Wand steht:
 *   0 Lager & Strand  (Start)
 *   1 Wald            (hinter dem Fluss, umgestürzter Baumstamm blockiert)
 *   2 Klippen         (hinter dem Kanal, Brücke nötig)
 *   3 Stille Insel    (draußen im Wasser, nur mit dem Boot)
 *
 * Die vierte liegt im Westen, wo bei jedem Seed offenes Wasser war – über
 * acht Seeds gemessen lag die westlichste Landkachel bei x = 22. Zwischen
 * ihr und dem Festland bleibt ein Streifen tiefes Wasser: Man kann nicht
 * hinüberlaufen, auch nicht bei einer Insel, die der Zufall breit geraten
 * lässt. Ein Test prüft genau das.
 */
import { makeRng, makeNoise2D, fbm, hashString, randInt, randRange } from '../core/rng.js';
import { T, TILE_SIZE, isWalkable } from '../art/tiles.js';

/**
 * Der Maßstab der Insel.
 *
 * Alles, was unten als Kachelzahl steht – Fluss, Kanal, Furt, Brücke,
 * Lagerplatz, Steg, Inselkerne, Landengen –, ist mit diesem Faktor
 * gerechnet. Die Zahlen davor sind die ursprüngliche 96er-Karte; so
 * bleibt nachvollziehbar, wo die Geografie herkommt, und eine weitere
 * Vergrößerung ist eine einzige Zahl statt dreißig.
 *
 * 1,5 heißt: 144 statt 96 Kacheln je Seite, also die 2,25-fache Fläche.
 * Weiter wollte ich nicht in einem Schritt gehen – die Spielfigur läuft
 * gleich schnell wie vorher, und eine Insel, deren Durchquerung dreimal
 * so lange dauert, ist keine größere Welt mehr, sondern ein längerer Weg.
 *
 * Was NICHT mitwächst: die Grundstücke (ein Garten ist ein Garten), die
 * Breite der Landengen und der Furt (ein Weg ist ein Weg) und die
 * Größe der Objekte. Mitwachsen tut, was eine Fläche ist.
 */
export const MASSSTAB = 1.5;

/** Eine Kachelzahl der alten Karte auf die neue umrechnen. */
const M = function (n) { return Math.round(n * MASSSTAB); };

/**
 * Eine RAUSCHFREQUENZ auf den neuen Maßstab umrechnen.
 *
 * Das ist die Umkehrung von `M`, und sie ist nicht offensichtlich: Wenn
 * die Insel wächst, die Frequenz aber bleibt, dann werden die Buchten,
 * Felsflecken und Lichtungen relativ zur Insel KLEINER – die Küste wird
 * kleinteiliger, die Landengen zerfransen. Gemessen: Eine Landenge, die
 * fünf Kacheln breit sein soll, maß plötzlich 25, weil das Rauschen
 * daneben eine eigene Landbrücke erfand.
 *
 * Mit geteilter Frequenz sieht dieselbe Insel aus wie vorher, nur
 * größer. Das ist die vorhersagbare Wahl; feinere Küsten wären eine
 * eigene Entscheidung und keine Nebenwirkung einer Vergrößerung.
 */
const F = function (n) { return n / MASSSTAB; };

export const MAP_W = M(96);
export const MAP_H = M(96);

export const REGION = { CAMP: 0, FOREST: 1, CLIFFS: 2, ISLE: 3 };

export const REGION_NAMES = ['Lager & Strand', 'Wald', 'Klippen', 'Stille Insel'];

/**
 * Alle Bereiche in einer Liste.
 *
 * Abgeleitet statt abgeschrieben: Die Tagesereignisse zählten ihre Bereiche
 * dreimal von Hand auf. Beim vierten wären Grabstellen, Blütentag und die
 * seltenen Gewächse an drei Stellen stillschweigend an der Insel vorbeigegangen.
 */
export const ALL_REGIONS = Object.keys(REGION).map(function (k) { return REGION[k]; });

// Feste Bauwerke / Sperren
/**
 * Der Fluss zwischen Wald und Lager.
 *
 * Er war fünf Kacheln breit (plus Saum, also sieben Wasser) und lief
 * über die GANZE Kartenbreite – quer durch das Meer und mitten durch
 * die Inseln im Westen. Zusammen mit der Schlucht ergab das auf der
 * Karte ein Kreuz, das die Welt in vier Viertel schnitt. Ein Fluss
 * dieser Breite ist auch kein Fluss mehr, sondern eine Meerenge.
 *
 * Jetzt drei Kacheln, und nur dort, wo Land ist (siehe `carveRiver`).
 */
export const RIVER_Y0 = M(38);
export const RIVER_Y1 = M(40);
export const FORD_X0 = M(42);
export const FORD_X1 = M(45);
/**
 * Die Schlucht zwischen Festland und Klippen – früher ein Meeresarm.
 *
 * Hier standen X0=59 und X1=64, also NEUN Kacheln Wasser quer durch das
 * Land. Gemessen zerfiel die Welt damit in drei Massen: 60 Prozent
 * Festland, 26 Prozent Klippen, 14 Prozent Stille Insel. Neun Kacheln
 * offenes Wasser sind keine Schlucht, das ist eine Meerenge – und eine
 * Meerenge macht aus einem Land zwei Inseln.
 *
 * Jetzt drei Kacheln. Das Tor bleibt: Ohne Brücke kommt man nicht
 * hinüber, und das ist der Sinn der Sache. Aber man SIEHT die andere
 * Seite, man erkennt sie als dasselbe Land, und der Bach unten in der
 * Schlucht liest sich als Bach und nicht als See.
 *
 * Die Ufer werden Fels statt Sand (siehe `carveChannel`): Sand heißt
 * Strand, und ein Strand heißt Meer. Fels heißt, dass hier etwas
 * aufgerissen ist.
 */
export const CHANNEL_X0 = M(61);
export const CHANNEL_X1 = M(63);
/**
 * Die Schlucht reicht über die volle Kartenhöhe – wie der Sund.
 *
 * Hier stand 26 bis 74, also ein Riss, der oben und unten im offenen
 * Meer endete. Das war richtig, solange das Land dort nicht hinreichte.
 * Mit den neuen, grösseren Kernen reicht es: Gemessen lag die ganze
 * Welt plötzlich in EINER Masse mit 87 Prozent – man konnte unten um
 * die Schlucht herumlaufen, und damit war die Brücke kein Tor mehr,
 * sondern eine Abkürzung.
 *
 * Über die volle Höhe kostet nichts: Wo kein Land ist, ist ohnehin
 * Wasser.
 */
export const CHANNEL_Y0 = 0;
export const CHANNEL_Y1 = MAP_H - 1;
export const BRIDGE_Y0 = M(49);
export const BRIDGE_Y1 = M(51);

export const CAMP_TILE = { x: M(44), y: M(62) };

/**
 * Der Sund zwischen Festland und Stiller Insel.
 *
 * Ausgehoben, nicht erhofft: Bei acht Seeds lag die westlichste Landkachel
 * zwar bei x = 22, aber bei einem davon wuchs eine Landbrücke bis zur Insel
 * hinüber – gemessen 309 zu Fuß erreichbare Inselkacheln. Fluss und Kanal
 * werden aus demselben Grund gegraben. Die Bereichsgrenze liegt in der
 * Mitte des Sunds, also auf beiden Seiten im Wasser: So bekommt kein
 * Festlandufer aus Versehen die Kennung der Insel.
 */
export const SOUND_X0 = M(17);
export const SOUND_X1 = M(21);
/** Alles westlich davon gehört zur Stillen Insel. */
export const ISLE_X1 = M(19);
/** Wo das Boot anlegt – Festlandseite und Inselseite. */
/**
 * Der Festlandanleger musste nach Osten: Mit den neuen Kernen liegt die
 * Westküste weiter innen, und x = 24 war auf zwei von fünf Inselwürfen
 * Wasser.
 */
export const DOCK_TILE = { x: M(27), y: M(52) };
export const ISLE_DOCK_TILE = { x: M(14), y: M(52) };

/**
 * Die Kerne der Insel.
 *
 * Die Stille Insel bestand aus einem einzigen Kern mit Radius 9 und war
 * damit gemessen der kleinste Bereich mit Abstand: 199 begehbare Kacheln
 * gegen 1227 im Lager, 881 im Wald und 526 auf den Klippen. Wer nach dem
 * Meilenstein übersetzt, steht nach zwei Minuten wieder am Boot.
 *
 * Nach Osten kann sie nicht wachsen – dort liegt der Sund, und dahinter
 * beginnt bei x=24 das Festland. Nach Norden und Süden war dagegen alles
 * frei: Von 96 Zeilen benutzte sie sechzehn. Drei Kerne übereinander machen
 * daraus eine lange Insel statt einer größeren Scheibe, und die Fahrt von
 * einem Ende zum anderen ist selbst schon etwas.
 */
const LOBES = [
  /**
   * Das Festland – EIN Land, nicht eine Perlenkette.
   *
   * Hier standen drei Kerne: Lager, Wald, Klippen. Sie berührten sich
   * kaum, und zwischen zwei Kernen entscheidet nur das Rauschen über
   * Land oder Wasser – auf der Karte sah man drei Kreise an dünnen
   * Hälsen. Gemessen zerfiel die Welt in drei Massen (60 / 26 / 14
   * Prozent), und so sah sie auch aus: nach einem Archipel.
   *
   * Jetzt sieben Kerne, die sich ÜBERLAPPEN. Weil die Höhe das Maximum
   * über alle Kerne ist, wird aus überlappenden Kreisen eine einzige
   * Fläche mit unruhigem Rand – und aus sich berührenden Kreisen eine
   * Kette. Der Unterschied ist genau der zwischen einem Land und
   * mehreren Inseln.
   *
   * Die Schlucht schneidet den Osten davon ab (siehe `carveChannel`).
   * Das ist Absicht und etwas anderes als vorher: Der Osten ist
   * dieselbe Landmasse, nur mit einem Riss davor, den man ohne Brücke
   * nicht überquert.
   */
  { x: M(40), y: M(22), r: M(20) },   // Wald – der Norden
  { x: M(33), y: M(40), r: M(14) },   // Westflanke, schliesst die Lücke
  { x: M(52), y: M(37), r: M(16) },   // Ostflanke des Nordens
  { x: M(44), y: M(60), r: M(21) },   // Lager / Strand
  { x: M(62), y: M(65), r: M(17) },   // der Südosten, reicht bis an die Schlucht
  /**
   * Die Klippen – kleiner als beim ersten Entwurf.
   *
   * Mit r=15 und r=12 waren sie 2551 begehbare Kacheln, also fast so
   * gross wie das Lager. Dort wohnt aber nur EIN Geist, und ein Farbkreis
   * wächst in der Fläche: Um von Nelly aus die entfernteste Ecke zu
   * erreichen, braucht er einen Radius von rund fünfzig Kacheln, und das
   * meiste davon liegt im Meer. Gemessen verdoppelte das die Färbung der
   * ganzen Insel von rund 330 auf 761 Aufträge.
   *
   * Ein Bereich darf nicht beliebig wachsen, solange sein Geist allein
   * darin steht. Jetzt rund 1700 Kacheln – zwischen Wald (2576, zwei
   * Geister) und den Inseln.
   */
  { x: M(79), y: M(50), r: M(10) },   // Klippen – jenseits der Schlucht
  { x: M(75), y: M(68), r: M(7) },    // Klippen – der Südzipfel

  /**
   * Und die beiden Inseln im Westen.
   *
   * Vorher waren das drei Kerne in einer Reihe, die mit zwei
   * aufgeschütteten Landengen zu einer langen Insel verbunden wurden –
   * 1140 Kacheln, also ein zweites Festland mit eigenen Biomen und
   * eigenem Grundstück. Auf der Karte las man trotzdem drei Inseln,
   * weil die Landengen nur fünf Kacheln breit sind.
   *
   * Jetzt zwei getrennte Inseln ohne Landengen: Was ohnehin wie zwei
   * Inseln aussah, IST jetzt zwei Inseln, und jede ist klein genug, um
   * als Insel zu gelten. Die nördliche ist felsig (siehe `HIGHLAND_Y`)
   * – dort steht der Granit, und das gibt ihr einen eigenen Grund,
   * hinzufahren.
   */
  { x: M(9), y: M(48), r: M(11) },    // Wandas Insel
  { x: M(9), y: M(17), r: M(9) },     // die Felseninsel im Norden
];

/**
 * Die beiden Landengen der Stillen Insel.
 *
 * Drei Kerne machen eine lange Insel – aber sie machen sie nicht
 * zusammenhängend. Zwischen den Kernen zählt nur das Rauschen, und das ist
 * ein Münzwurf je Kachel: Gemessen war das Hochland bei ALLEN geprüften
 * Seeds vom Anleger aus zu Fuß unerreichbar, und die Bucht im Süden bei
 * zweien von acht. Wer dort sein Grundstück gekauft hatte, stand vor Wasser.
 *
 * Deshalb werden die Verbindungen gegraben und nicht erhofft – genau wie die
 * Furt über den Fluss und die Anlandungen der Brücke. Schmal gehalten: Eine
 * Landenge, über die man in fünf Schritten geht, ist ein Ort. Ein Kern, der
 * bis zum nächsten reicht, wäre nur eine große Scheibe.
 */
const ISTHMUS = [];
/** Halbe Breite einer Landenge: fünf Kacheln plus Saum. */
const ISTHMUS_HALB = 2;

/**
 * Wo auf der Stillen Insel das Hochland beginnt.
 *
 * Nördlich davon wird aus Gras Felsboden, und dort steht das Erz, an das man
 * nur mit der dritten Spitzhackenstufe kommt. Ein Bereich, der aussieht wie
 * jeder andere, ist kein neuer Bereich.
 */
/**
 * Wo auf den Inseln der Fels anfaengt.
 *
 * Fruher lag die Grenze mitten in der einen langen Insel: Noerdlich davon
 * Fels, suedlich Wiese. Jetzt sind es zwei Inseln, und die Grenze liegt
 * im Wasser DAZWISCHEN – die noerdliche ist ganz aus Fels, die suedliche
 * ganz aus Wiese.
 *
 * Das ist mehr als eine verschobene Zahl: Eine halb felsige Insel ist
 * eine Insel mit einer Ecke; eine ganz felsige ist ein Ort. Gemessen lag
 * der Felsanteil im alten Norden je nach Inselwurf zwischen 19 und 52
 * Prozent – eine Pruefung hat die 19 gemeldet, weil der schmale Nordzipfel
 * fast nur aus Strand bestand.
 */
export const HIGHLAND_Y = M(32);

export function tileIndex(tx, ty) {
  return ty * MAP_W + tx;
}

/**
 * Domänenverzerrung: der Abtastpunkt wird selbst per Rauschen verschoben.
 *
 * Ohne das laufen die Grenzen zwischen Wiese, Felsboden und Wasser über viele
 * Kacheln hinweg fast gerade – im Bild sieht man dann Rechtecke statt
 * gewachsener Ränder. Mit der Verzerrung mäandern sie.
 */
function warp(n, x, y, amount) {
  const wx = fbm(n, x + 11.3, y + 4.7, 2, 2.0, 0.5) - 0.5;
  const wy = fbm(n, x - 7.1, y + 19.4, 2, 2.0, 0.5) - 0.5;
  return [x + wx * amount, y + wy * amount];
}

export function regionAt(tx, ty) {
  // Der Westen zuerst: Die Insel liegt links von allem anderen, und über
  // acht Seeds gemessen reicht kein Festland weiter als bis x = 22.
  if (tx <= ISLE_X1) return REGION.ISLE;
  if (tx >= CHANNEL_X1 + 1) return REGION.CLIFFS;
  if (ty <= RIVER_Y0 - 1) return REGION.FOREST;
  return REGION.CAMP;
}

/** Erzeugt die Kachelkarte. */
export function generateTiles(seed) {
  const noise = makeNoise2D(seed ^ 0x9e3779b9);
  const detail = makeNoise2D(seed ^ 0x85ebca6b);
  const tiles = new Uint8Array(MAP_W * MAP_H);

  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      // Höhenfeld: Abstand zu den drei Inselkernen, weich überlagert
      let land = -1;
      for (let i = 0; i < LOBES.length; i++) {
        const L = LOBES[i];
        const dx = (tx - L.x) / L.r;
        const dy = (ty - L.y) / L.r;
        const d = Math.sqrt(dx * dx + dy * dy);
        const v = 1 - d;
        if (v > land) land = v;
      }
      const wh = warp(detail, tx * F(0.09), ty * F(0.09), 1.1);
      const n = fbm(noise, wh[0], wh[1], 4, 2.0, 0.5) - 0.5;
      const h = land + n * 0.55;

      let t;
      if (h < -0.22) t = T.WATER_DEEP;
      else if (h < 0.02) t = T.WATER;
      else if (h < 0.12) t = T.SAND;
      else t = T.GRASS;

      // Felsboden auf den Klippen
      if (t === T.GRASS && tx > CHANNEL_X1) {
        const wr = warp(noise, tx * F(0.14), ty * F(0.14), 1.9);
        const rock = fbm(detail, wr[0], wr[1], 3, 2.0, 0.5);
        if (rock > 0.58) t = T.ROCKFLOOR;
      }
      // Das Hochland der Stillen Insel: hier überwiegt der Fels, sonst sähe
      // der Norden aus wie die Mitte und wäre kein eigener Ort.
      if (t === T.GRASS && tx <= ISLE_X1 && ty < HIGHLAND_Y) {
        const wh2 = warp(noise, tx * F(0.13) + 200, ty * F(0.13), 1.7);
        const fels = fbm(detail, wh2[0], wh2[1], 3, 2.0, 0.5);
        if (fels > 0.40) t = T.ROCKFLOOR;
      }
      // Trampelpfade / Lichtungen im Wald
      if (t === T.GRASS && ty < RIVER_Y0) {
        const wd = warp(noise, tx * F(0.17) + 40, ty * F(0.17), 1.9);
        const dirtN = fbm(detail, wd[0], wd[1], 3, 2.0, 0.5);
        if (dirtN > 0.66) t = T.DIRT;
      }
      tiles[tileIndex(tx, ty)] = t;
    }
  }

  carveRiver(tiles, detail);
  carveChannel(tiles, detail);
  carveSound(tiles, detail);
  buildFord(tiles);
  buildIsthmus(tiles, detail);
  flattenCamp(tiles);
  addBeachRim(tiles);

  const hoehen = berechneHoehen(seed, tiles);
  strandUnterDerKlippe(tiles, hoehen);
  setzeSteilkanten(tiles, hoehen);
  oeffneRampen(tiles);
  HOEHEN_CACHE.seed = seed >>> 0;
  HOEHEN_CACHE.data = hoehen;
  return tiles;
}

/**
 * Unter der Klippe liegt Strand, nicht Wiese.
 *
 * Der Saum zwischen Klippenfuss und Wasser war vorher zum grössten Teil
 * Gras: gemessen zwei bis drei Kacheln Sand und darüber noch drei bis
 * sechs Kacheln Wiese, bevor die Wand kam. Im Bild las sich das als
 * zweite, tiefere Wiese – nicht als Küste.
 *
 * Gewollt ist die Abfolge des Vorbilds: oben die Hochfläche, dann der
 * Absturz, dann SAND, dann Meer. Also wird alles, was unterhalb der
 * Klippe liegt und ans Meer grenzt, zu Strand.
 *
 * Zwei Dinge bleiben ausgenommen. Das Lager und die Grundstücke: Dort
 * soll man bauen und pflanzen, und auf Sand wächst nichts. Und die
 * Ufer von Fluss und Sund: Ein Sandstrand an einem Bach im Landesinneren
 * wäre eine Verwechslung von „am Wasser" mit „am Meer".
 */
function strandUnterDerKlippe(tiles, hoehen) {
  const abstand = wasserAbstand(tiles);
  const amMeer = meerNaehe(tiles);
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const i = tileIndex(tx, ty);
      if (tiles[i] !== T.GRASS) continue;
      if (hoehen[i] !== 0) continue;
      if (nahAmLager(tx, ty)) continue;
      // Nur der äussere Saum, und nur am offenen Meer.
      if (abstand[i] > 5 || !amMeer[i]) continue;
      tiles[i] = T.SAND;
    }
  }
}

/**
 * Welche Kacheln an das offene Meer grenzen – und welche nur an Fluss
 * oder Sund.
 *
 * Das Meer ist die Wasserfläche, die den Kartenrand berührt. Alles
 * andere Wasser ist Binnenwasser, auch wenn es genauso aussieht.
 */
function meerNaehe(tiles) {
  const meer = new Uint8Array(MAP_W * MAP_H);
  const q = [];
  for (let tx = 0; tx < MAP_W; tx++) {
    for (const ty of [0, MAP_H - 1]) {
      const i = tileIndex(tx, ty);
      if (isWalkable(tiles[i]) || meer[i]) continue;
      meer[i] = 1;
      q.push(tx, ty);
    }
  }
  for (let ty = 0; ty < MAP_H; ty++) {
    for (const tx of [0, MAP_W - 1]) {
      const i = tileIndex(tx, ty);
      if (isWalkable(tiles[i]) || meer[i]) continue;
      meer[i] = 1;
      q.push(tx, ty);
    }
  }
  let kopf = 0;
  while (kopf < q.length) {
    const x = q[kopf++];
    const y = q[kopf++];
    const nb = [x + 1, y, x - 1, y, x, y + 1, x, y - 1];
    for (let k = 0; k < 8; k += 2) {
      const nx = nb[k];
      const ny = nb[k + 1];
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      const i = tileIndex(nx, ny);
      if (meer[i] || isWalkable(tiles[i])) continue;
      meer[i] = 1;
      q.push(nx, ny);
    }
  }
  // Und jetzt: Welches LAND liegt im Umkreis von sechs Kacheln am Meer?
  const nah = new Uint8Array(MAP_W * MAP_H);
  const q2 = [];
  const tiefe = new Int16Array(MAP_W * MAP_H).fill(-1);
  for (let i = 0; i < meer.length; i++) {
    if (!meer[i]) continue;
    tiefe[i] = 0;
    q2.push(i % MAP_W, Math.floor(i / MAP_W));
  }
  kopf = 0;
  while (kopf < q2.length) {
    const x = q2[kopf++];
    const y = q2[kopf++];
    const d = tiefe[tileIndex(x, y)];
    if (d >= 6) continue;
    const nb = [x + 1, y, x - 1, y, x, y + 1, x, y - 1];
    for (let k = 0; k < 8; k += 2) {
      const nx = nb[k];
      const ny = nb[k + 1];
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      const i = tileIndex(nx, ny);
      if (tiefe[i] >= 0) continue;
      tiefe[i] = d + 1;
      nah[i] = 1;
      q2.push(nx, ny);
    }
  }
  return nah;
}

/* ---------------------------------------------------------- Höhenstufen */

/**
 * Wie viele Stufen es gibt. Zwei über dem Grundniveau, nicht mehr.
 *
 * Drei Ebenen ergeben schon ein Dutzend Wände und Rampen; bei vier wäre
 * die Insel ein Labyrinth aus Umwegen, und Umwege sind das Gegenteil von
 * gemütlich. Das Vorbild kommt mit zwei aus.
 */
/**
 * Wie viele Höhenebenen es gibt – ohne die Grundebene gezählt.
 *
 * Von 2 auf 1. Drei Ebenen hiessen zwei Sorten Grenze, und die zweite
 * lag mitten in der ersten Hochfläche: Im Bild liefen Klippen durch
 * Gegenden, die eben aussehen sollten. Siehe `berechneHoehen`.
 */
export const MAX_STUFE = 1;

/**
 * Die Höhen werden in `generateTiles` berechnet und hier gemerkt.
 *
 * Warum ein Zwischenspeicher und keine zweite reine Funktion: Die Höhen
 * hängen nicht nur am Rauschen, sondern auch an der fertigen Kachelkarte
 * (Sand bleibt immer unten, das Lager auch, die Furt ebenfalls). Eine
 * zweite Funktion müsste die halbe Erzeugung wiederholen, und zwei
 * Rechnungen für dieselbe Sache laufen beim ersten Zahlendreher
 * auseinander. Die Erzeugung ist deterministisch, der Speicher deshalb
 * nur eine Abkürzung – fragt jemand nach einem anderen Samen, wird neu
 * erzeugt.
 */
const HOEHEN_CACHE = { seed: -1, data: null };

/** Die Höhenstufen zu einem Samen. */
export function hoehenFuer(seed) {
  const s = seed >>> 0;
  if (HOEHEN_CACHE.seed !== s || !HOEHEN_CACHE.data) generateTiles(s);
  return HOEHEN_CACHE.data;
}

/**
 * Das Höhenfeld.
 *
 * Große, weiche Flecken aus eigenem Rauschen – nicht aus demselben wie das
 * Land, sonst läge jede Hochfläche genau dort, wo ohnehin schon Felsboden
 * ist, und die Insel hätte eine Eigenschaft weniger statt einer mehr.
 *
 * Vier Dinge bleiben IMMER unten, und jedes aus einem eigenen Grund:
 * Sand und Watt, weil ein Strand flach ins Wasser läuft; das Lager, weil
 * dort alles steht und der erste Blick nicht von einer Wand verstellt
 * sein soll; Furt und Brücke, weil ein Übergang, vor dem eine Wand steht,
 * kein Übergang ist; und natürlich das Wasser selbst.
 */
function berechneHoehen(seed, tiles) {
  const n = makeNoise2D(seed ^ 0x27d4eb2f);
  const hoehen = new Uint8Array(MAP_W * MAP_H);

  /**
   * Die Klippe liegt AUSSEN, nicht mitten in der Welt.
   *
   * Vorher entschied ein Rauschfeld über die Höhe, und das streute
   * Hochflächen über die ganze Insel. Egal wie gross und wie wenige sie
   * waren: Ihre Ränder liefen quer durch die Wiese, und eine Wand
   * mitten im Gelände stört mehr, als sie hergibt – man läuft dagegen,
   * sucht die Rampe und hat nichts davon.
   *
   * Im Vorbild liegt der Absatz dort, wo er hingehört: Das Landesinnere
   * ist eine zusammenhängende Hochfläche, aussen fällt sie zum Strand
   * ab. Die Klippe ist damit der RAND der Insel und kein Hindernis in
   * ihr – man sieht sie von aussen und läuft oben darauf herum.
   *
   * Gerechnet wird sie deshalb aus dem Abstand zum Wasser, nicht aus
   * einem Rauschfeld: Was weiter als ein paar Kacheln vom Meer weg
   * liegt, ist oben. Das Rauschen verschiebt nur noch die Breite dieses
   * Saums, damit die Kante nicht wie mit dem Zirkel gezogen aussieht.
   */
  // Fünf Kacheln, nicht sieben: Unter der Klippe soll STRAND liegen,
  // und ein Strand von sieben Kacheln ist eine Wüste. Siehe
  // `strandUnterDerKlippe`.
  const SAUM = 5;
  const abstand = wasserAbstand(tiles);
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const i = tileIndex(tx, ty);
      const t = tiles[i];
      if (t !== T.GRASS && t !== T.DIRT && t !== T.ROCKFLOOR) continue;
      // Der Saum wackelt zwischen vier und zehn Kacheln.
      const w = fbm(n, tx * F(0.035), ty * F(0.035), 2, 2.0, 0.5);
      const breite = SAUM + Math.round((w - 0.5) * 6);
      if (abstand[i] > breite) hoehen[i] = 1;
    }
  }
  /**
   * Lager und Grundstücke bekommen EINE Höhe – die ihrer Umgebung.
   *
   * Hier wurden sie vorher einfach übersprungen und blieben damit auf
   * null. Mitten in einer Hochfläche ist das kein ebener Platz, sondern
   * eine Senke – und rings um das Lager stand dann eine Mauer. Gemessen:
   * bis zu 49 Klippenkacheln je Insel lagen mehr als vierzehn Kacheln
   * vom Wasser entfernt, also tief im Land, und fast alle davon waren
   * dieser Rand.
   *
   * Übersprungen ist also falsch; richtig ist „so hoch wie ringsum".
   * Welche Höhe das ist, sagt dieselbe Abstandsregel an der Mitte des
   * Lagers – liegt es im Landesinneren, liegt das Lager oben, und die
   * Klippe bleibt draussen am Rand, wo sie hingehört.
   */
  const lagerHoch = hoehen[tileIndex(CAMP_TILE.x, CAMP_TILE.y)];
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      if (!nahAmLager(tx, ty)) continue;
      const i = tileIndex(tx, ty);
      const t = tiles[i];
      if (t !== T.GRASS && t !== T.DIRT && t !== T.ROCKFLOOR) continue;
      hoehen[i] = lagerHoch;
    }
  }
  glaetteHoehen(hoehen, tiles);
  entferneSplitter(hoehen, tiles);
  glaetteHoehen(hoehen, tiles);
  return hoehen;
}

/**
 * Wie weit jede Kachel vom Wasser weg liegt, in Kacheln.
 *
 * Eine Flutfüllung vom Wasser aus – billiger und genauer als für jede
 * Kachel in alle Richtungen zu suchen, und sie liefert denselben Wert
 * für Inseln jeder Form.
 */
function wasserAbstand(tiles) {
  const d = new Int16Array(MAP_W * MAP_H).fill(-1);
  const schlange = [];
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const i = tileIndex(tx, ty);
      if (isWalkable(tiles[i])) continue;
      d[i] = 0;
      schlange.push(tx, ty);
    }
  }
  let kopf = 0;
  while (kopf < schlange.length) {
    const x = schlange[kopf++];
    const y = schlange[kopf++];
    const hier = d[tileIndex(x, y)];
    const nb = [x + 1, y, x - 1, y, x, y + 1, x, y - 1];
    for (let k = 0; k < 8; k += 2) {
      const nx = nb[k];
      const ny = nb[k + 1];
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      const i = tileIndex(nx, ny);
      if (d[i] >= 0) continue;
      d[i] = hier + 1;
      schlange.push(nx, ny);
    }
  }
  return d;
}

/**
 * Die beiden Bauplätze – dort bleibt es eben.
 *
 * Nicht „im Umkreis des Lagers", sondern genau die Rechtecke, die man
 * kaufen kann, plus eine Kachel Rand. Eine Felswand mitten im eigenen
 * Garten ist absurd, und sie wäre auch nicht wegzuräumen: Eine Steilkante
 * ist kein Baum. Mit einem Kreis von zwölf Kacheln lag das größte
 * Grundstück zu einem Viertel außerhalb, und die Prüfung „Gerodet gibt
 * das Grundstück wirklich Bauplatz her" meldete 16×16 statt 23.
 *
 * Die Maße stehen hier und nicht als Import aus `game/plot.js`: Das Modul
 * holt sich seinerseits `CAMP_TILE` und `MAP_W` von hier, und ein Kreis
 * aus zwei Dateien, die einander brauchen, lädt in keiner Reihenfolge.
 * Dass die Zahlen zu den Grundstücksstufen passen, prüft ein Test – der
 * importiert beides und darf das.
 */
const FLACHE_PLAETZE = [
  // Die Maße der Grundstücke wachsen NICHT mit (ein Garten ist ein
  // Garten), ihre Mittelpunkte schon.
  { x: CAMP_TILE.x, y: CAMP_TILE.y, hx: 17, hy: 12 },
  // Die Bucht ist mit der Insel nach Norden gewandert – siehe
  // `ISLE_PLOT_TILE`. Blieb dieses Rechteck stehen, stand eine Felswand
  // mitten im Inselgarten; eine Prüfung hat sie gefunden.
  { x: M(10), y: M(54), hx: 10, hy: 16 },
];

function nahAmLager(tx, ty) {
  for (let i = 0; i < FLACHE_PLAETZE.length; i++) {
    const p = FLACHE_PLAETZE[i];
    if (Math.abs(tx - p.x) <= p.hx && Math.abs(ty - p.y) <= p.hy) return true;
  }
  return false;
}

/**
 * Jeder Übergang samt Vorfeld – dort bleibt es eben.
 *
 * Furt, Brücke und die beiden Landengen der Stillen Insel. Sie sind die
 * einzigen Wege zwischen den Teilen der Insel, und eine Landenge ist fünf
 * Kacheln breit: Eine Steilkante quer darüber macht aus ihr keinen
 * Umweg, sondern eine Sackgasse. Genau das meldete die Prüfung „Die
 * Landengen sind Engen, keine zweite Insel" – auf einem Samen blieben
 * zwei Kacheln Land übrig.
 */
function amUebergang(tx, ty) {
  if (tx >= FORD_X0 - 4 && tx <= FORD_X1 + 4 && ty >= RIVER_Y0 - 5 && ty <= RIVER_Y1 + 5) return true;
  if (tx >= CHANNEL_X0 - 5 && tx <= CHANNEL_X1 + 5 && ty >= BRIDGE_Y0 - 5 && ty <= BRIDGE_Y1 + 5) return true;
  for (let k = 0; k < ISTHMUS.length; k++) {
    const L = ISTHMUS[k];
    if (ty < L.y0 - 3 || ty > L.y1 + 3) continue;
    if (tx >= L.x - ISTHMUS_HALB - 5 && tx <= L.x + ISTHMUS_HALB + 5) return true;
  }
  return false;
}

/**
 * Einzelne Kacheln einsammeln, die aus der Reihe tanzen.
 *
 * Rohes Rauschen erzeugt Hochflächen mit ausgefransten Rändern und
 * einzelnen Kacheln mitten im Nichts. Jede davon würde später von einer
 * Wand umstellt – aus einer einzelnen Kachel wird so ein unbegehbarer
 * Punkt mitten auf der Wiese. Zwei Durchgänge Mehrheitsentscheid machen
 * daraus zusammenhängende Flächen.
 */
function glaetteHoehen(hoehen, tiles) {
  for (let runde = 0; runde < 2; runde++) {
    const kopie = hoehen.slice();
    for (let ty = 1; ty < MAP_H - 1; ty++) {
      for (let tx = 1; tx < MAP_W - 1; tx++) {
        const i = tileIndex(tx, ty);
        const t = tiles[i];
        if (t !== T.GRASS && t !== T.DIRT && t !== T.ROCKFLOOR) continue;
        const zaehler = [0, 0, 0];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            zaehler[kopie[tileIndex(tx + dx, ty + dy)]]++;
          }
        }
        let beste = 0;
        for (let z = 1; z <= MAX_STUFE; z++) if (zaehler[z] > zaehler[beste]) beste = z;
        // Nur ändern, wenn die Nachbarschaft deutlich anders ist: Sonst
        // frisst der Mehrheitsentscheid die Hochflächen in zwei Runden auf.
        if (zaehler[beste] >= 6) hoehen[i] = beste;
      }
    }
  }
}

/**
 * Kleine Hochflächen und kleine Löcher wieder einebnen.
 *
 * Das Glätten über die Nachbarschaft nimmt einzelne Ausreißer weg, aber
 * keine zusammenhängenden Flecken von zwanzig Kacheln – und genau die
 * sind das Ärgernis: Eine Hochfläche, die kleiner ist als der
 * Bildausschnitt, sieht nicht aus wie ein Plateau, sondern wie ein
 * Hügelchen mit einer Mauer drumherum. Dasselbe gilt für ein Loch in
 * einer Hochfläche.
 *
 * Gemessen wird deshalb die GRÖSSE jedes zusammenhängenden Flecks, und
 * was zu klein ist, bekommt die Höhe seiner Umgebung. 90 Kacheln sind
 * ungefähr ein halber Bildausschnitt – ab da ist es eine Gegend.
 */
function entferneSplitter(hoehen, tiles) {
  const MINDEST = 90;
  const begehbar = function (i) {
    const t = tiles[i];
    return t === T.GRASS || t === T.DIRT || t === T.ROCKFLOOR;
  };
  const gesehen = new Uint8Array(MAP_W * MAP_H);
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const i0 = tileIndex(tx, ty);
      if (gesehen[i0] || !begehbar(i0)) continue;
      const stufe = hoehen[i0];
      const fleck = [i0];
      const stapel = [tx, ty];
      gesehen[i0] = 1;
      // Woran der Fleck grenzt – die häufigste Nachbarhöhe gewinnt.
      const rand = [0, 0, 0];
      while (stapel.length) {
        const y = stapel.pop();
        const x = stapel.pop();
        const nb = [x + 1, y, x - 1, y, x, y + 1, x, y - 1];
        for (let k = 0; k < 8; k += 2) {
          const nx = nb[k];
          const ny = nb[k + 1];
          if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
          const i = tileIndex(nx, ny);
          if (!begehbar(i)) continue;
          if (hoehen[i] !== stufe) { rand[hoehen[i]]++; continue; }
          if (gesehen[i]) continue;
          gesehen[i] = 1;
          fleck.push(i);
          stapel.push(nx, ny);
        }
      }
      if (fleck.length >= MINDEST) continue;
      let ziel = 0;
      for (let z = 1; z <= MAX_STUFE; z++) if (rand[z] > rand[ziel]) ziel = z;
      if (ziel === stufe) continue;
      for (let k = 0; k < fleck.length; k++) hoehen[fleck[k]] = ziel;
    }
  }
}

/**
 * Die Steilkanten setzen.
 *
 * Eine begehbare Kachel, neben der es HÖHER weitergeht, wird zur Wand.
 * Die Wand steht damit am Fuß der oberen Fläche, nicht auf ihr – oben
 * läuft die Grasnarbe bis an die Kante, und das ist genau der Überhang,
 * den man im Bild sieht.
 */
function setzeSteilkanten(tiles, hoehen) {
  const vorher = tiles.slice();
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const i = tileIndex(tx, ty);
      if (!isWalkable(vorher[i])) continue;
      const z = hoehen[i];
      let hoeher = false;
      if (tx > 0 && hoehen[i - 1] > z && isWalkable(vorher[i - 1])) hoeher = true;
      if (tx < MAP_W - 1 && hoehen[i + 1] > z && isWalkable(vorher[i + 1])) hoeher = true;
      if (ty > 0 && hoehen[i - MAP_W] > z && isWalkable(vorher[i - MAP_W])) hoeher = true;
      if (ty < MAP_H - 1 && hoehen[i + MAP_W] > z && isWalkable(vorher[i + MAP_W])) hoeher = true;
      /**
       * An einem Übergang steht nie eine Wand.
       *
       * `berechneHoehen` lässt Furt, Brücke und Landengen schon aus –
       * aber eine Kachel wird zur Wand, weil der NACHBAR höher ist, und
       * der Nachbar liegt ausserhalb des Übergangs. Solange die
       * Hochflächen klein und weit weg waren, traf das nie zu; mit
       * wenigen grossen Flächen reicht eine davon jetzt bis an die Furt.
       *
       * Die Regel gehört hierher und nicht ins Höhenfeld: Hier entsteht
       * die Wand, also wird hier entschieden, wo keine stehen darf. Ein
       * Übergang, vor dem eine Wand steht, ist kein Übergang.
       */
      /**
       * Weder auf einem Übergang noch auf einem Bauplatz steht eine Wand.
       *
       * Die Höhen sind für Lager und Grundstücke schon eingeebnet – aber
       * eine Kachel wird zur Wand, weil ihr NACHBAR höher ist, und der
       * liegt ausserhalb. An der Kante eines Grundstücks stand damit eine
       * Wand auf dem Grundstück: eine Mauer mitten im eigenen Garten, die
       * sich nicht wegräumen lässt, denn eine Steilkante ist kein Baum.
       * Dieselbe Falle wie bei der Furt, und eine Prüfung hat beide
       * gefunden.
       */
      if (hoeher && !amUebergang(tx, ty) && !nahAmLager(tx, ty)) tiles[i] = T.CLIFF;
    }
  }
  STEILKANTEN_VORHER.data = vorher;
}

/** Die Kachelarten vor dem Setzen der Wände – für das Öffnen der Rampen. */
const STEILKANTEN_VORHER = { data: null };

/**
 * Rampen öffnen, bis alles wieder erreichbar ist.
 *
 * Eine Rampe ist keine eigene Sache, sondern eine LÜCKE in der
 * Wandreihe. Gesucht wird sie nicht von Hand, sondern ausgerechnet: Vom
 * Lager aus wird geflutet; findet sich danach noch begehbares Land, das
 * nicht erreicht wurde, wird die Wand geöffnet, die es vom Erreichten
 * trennt. Dann wieder fluten, bis nichts mehr übrig ist.
 *
 * Das ist der einzige Weg, der ohne Handarbeit auskommt und trotzdem für
 * JEDEN Samen hält. Eine von Hand gesetzte Rampe stimmt für die Insel, auf
 * der man sie gesetzt hat.
 *
 * Was über WASSER getrennt liegt – die Stille Insel – bleibt getrennt:
 * Dorthin fährt das Boot, und dafür gibt es den Steg. Die Schleife hört
 * auf, sobald keine Wand mehr zwischen Erreichtem und Unerreichtem steht.
 */
function oeffneRampen(tiles) {
  const vorher = STEILKANTEN_VORHER.data;
  const besucht = new Uint8Array(MAP_W * MAP_H);
  let geoeffnet = 0;
  // Erst vom Lager aus, dann von jeder Landmasse, die danach noch übrig
  // ist. Denn Rampen verbinden nur, was ÜBER LAND zusammenhängt – die
  // Stille Insel liegt hinter Wasser, und ihre eigenen Hochflächen wären
  // sonst nie geöffnet worden. Genau das meldete die Prüfung „Die Insel
  // ist EINE Insel": 78 % erreichbar, weil vom Lager aus geflutet wurde.
  const erster = findWalkableNear(tiles, CAMP_TILE.x, CAMP_TILE.y, 20, null);
  if (erster) geoeffnet += oeffneVon(tiles, vorher, erster.x, erster.y, besucht);
  for (let masse = 0; masse < 40; masse++) {
    const start = naechsteLandmasse(tiles, besucht);
    if (!start) break;
    geoeffnet += oeffneVon(tiles, vorher, start[0], start[1], besucht);
  }
  return geoeffnet;
}

/** Rampen öffnen, bis von hier aus alles erreichbar ist. */
function oeffneVon(tiles, vorher, sx, sy, besucht) {
  let geoeffnet = 0;
  let erreicht = null;
  for (let runde = 0; runde < 120; runde++) {
    erreicht = fluten(tiles, sx, sy);
    const weg = billigsterDurchbruch(tiles, erreicht);
    if (!weg || !weg.length) break;
    for (let k = 0; k < weg.length; k++) {
      const tx = weg[k] % MAP_W;
      const ty = (weg[k] / MAP_W) | 0;
      geoeffnet += oeffne(tiles, vorher, tx, ty);
      // Drei Kacheln breit, nicht eine: Eine einzelne Lücke in einer
      // Felswand liest sich als Loch, nicht als Weg nach oben.
      geoeffnet += oeffne(tiles, vorher, tx + 1, ty);
      geoeffnet += oeffne(tiles, vorher, tx - 1, ty);
      geoeffnet += oeffne(tiles, vorher, tx, ty + 1);
      geoeffnet += oeffne(tiles, vorher, tx, ty - 1);
    }
  }
  if (erreicht) for (let i = 0; i < besucht.length; i++) if (erreicht[i]) besucht[i] = 1;
  return geoeffnet;
}

/** Die erste begehbare Kachel, die noch zu keiner Landmasse gehört. */
function naechsteLandmasse(tiles, besucht) {
  for (let ty = 1; ty < MAP_H - 1; ty++) {
    for (let tx = 1; tx < MAP_W - 1; tx++) {
      const i = tileIndex(tx, ty);
      if (besucht[i] || !isWalkable(tiles[i])) continue;
      return [tx, ty];
    }
  }
  return null;
}

function oeffne(tiles, vorher, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return 0;
  const i = tileIndex(tx, ty);
  if (tiles[i] !== T.CLIFF) return 0;
  tiles[i] = vorher[i];
  return 1;
}

/** Flutet von einer Kachel aus über alles Begehbare. */
function fluten(tiles, sx, sy) {
  const erreicht = new Uint8Array(MAP_W * MAP_H);
  const stapel = [sx, sy];
  erreicht[tileIndex(sx, sy)] = 1;
  while (stapel.length) {
    const ty = stapel.pop();
    const tx = stapel.pop();
    const nach = [[tx + 1, ty], [tx - 1, ty], [tx, ty + 1], [tx, ty - 1]];
    for (let k = 0; k < 4; k++) {
      const nx = nach[k][0];
      const ny = nach[k][1];
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      const j = tileIndex(nx, ny);
      if (erreicht[j] || !isWalkable(tiles[j])) continue;
      erreicht[j] = 1;
      stapel.push(nx, ny);
    }
  }
  return erreicht;
}

/**
 * Der billigste Durchbruch vom Erreichten ins Unerreichte.
 *
 * Der erste Entwurf suchte EINE Wandkachel mit erreichtem und
 * unerreichtem Nachbarn. Das reichte nicht: Wo Stufe 0 an Stufe 1 an
 * Stufe 2 grenzt, steht die Wand zwei Kacheln dick, und dann gibt es
 * keine solche Kachel – die Prüfung meldete 72 % erreichbare Insel.
 *
 * Jetzt wird vom gesamten erreichten Gebiet aus gesucht, wobei begehbare
 * Kacheln nichts kosten und Wandkacheln eine. Gefunden wird damit die
 * Stelle, an der am WENIGSTEN Fels weg muss – und das ist auch die, an
 * der eine Rampe natürlich aussieht. Zurück kommen die Wandkacheln auf
 * diesem Weg.
 */
function billigsterDurchbruch(tiles, erreicht) {
  const N = MAP_W * MAP_H;
  const kosten = new Int32Array(N).fill(0x7fffffff);
  const woher = new Int32Array(N).fill(-1);
  // Null-Eins-Breitensuche: zwei Schlangen statt eines Haufens. Bei nur
  // zwei Kantengewichten ist das dasselbe wie Dijkstra, nur ohne
  // Sortieren.
  let jetzt = [];
  for (let i = 0; i < N; i++) {
    if (!erreicht[i]) continue;
    kosten[i] = 0;
    jetzt.push(i);
  }
  let ziel = -1;
  while (jetzt.length && ziel < 0) {
    const spaeter = [];
    for (let q = 0; q < jetzt.length && ziel < 0; q++) {
      const i = jetzt[q];
      const tx = i % MAP_W;
      const ty = (i / MAP_W) | 0;
      const nach = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (let k = 0; k < 4; k++) {
        const nx = tx + nach[k][0];
        const ny = ty + nach[k][1];
        if (nx < 1 || ny < 1 || nx >= MAP_W - 1 || ny >= MAP_H - 1) continue;
        const j = tileIndex(nx, ny);
        const wand = tiles[j] === T.CLIFF;
        if (!wand && !isWalkable(tiles[j])) continue;
        const neu = kosten[i] + (wand ? 1 : 0);
        if (neu >= kosten[j]) continue;
        kosten[j] = neu;
        woher[j] = i;
        if (!wand && !erreicht[j]) { ziel = j; break; }
        if (wand) spaeter.push(j); else jetzt.push(j);
      }
    }
    jetzt = spaeter;
  }
  if (ziel < 0) return null;
  const weg = [];
  for (let i = ziel; i >= 0; i = woher[i]) {
    if (tiles[i] === T.CLIFF) weg.push(i);
  }
  return weg;
}

/**
 * Der Fluss – von der Westküste bis in die Schlucht.
 *
 * Drei Dinge waren falsch, und alle drei zusammen haben aus einem Land
 * vier Viertel gemacht:
 *
 *   1. Er lief über die ganze Kartenbreite, also auch durch die Inseln
 *      im Westen. Aus zwei Inseln wurden vier.
 *   2. Er lief auch östlich der Schlucht weiter und hat damit die
 *      Klippen noch einmal in zwei Hälften geschnitten.
 *   3. Er mäanderte um ±3 Kacheln bei einer Breite von sieben – das
 *      sieht man nicht, und was man nicht sieht, ist eine gerade Linie.
 *      Zusammen mit der senkrechten Schlucht ergab das ein Kreuz.
 *
 * Jetzt: nur zwischen Sund und Schlucht, drei Kacheln breit, und mit
 * einem Mäander von ±7 Kacheln auf einer längeren Welle. Die Mündung
 * liegt im Westen, das obere Ende in der Schlucht – ein Fluss, der
 * irgendwo anfängt und irgendwo hingeht, statt einer Trennlinie.
 */
function carveRiver(tiles, detail) {
  for (let tx = ISLE_X1 + 2; tx < CHANNEL_X0; tx++) {
    const wobble = Math.round((fbm(detail, tx * F(0.055), 99, 2, 2, 0.5) - 0.5) * 14);
    const y0 = RIVER_Y0 + wobble;
    const y1 = RIVER_Y1 + wobble;
    for (let ty = y0 - 1; ty <= y1 + 1; ty++) {
      if (ty < 0 || ty >= MAP_H) continue;
      const i = tileIndex(tx, ty);
      if (tx >= FORD_X0 && tx <= FORD_X1) continue; // Furt bleibt Land
      const edge = ty < y0 || ty > y1;
      if (edge) {
        if (tiles[i] === T.GRASS || tiles[i] === T.DIRT) tiles[i] = T.SAND;
      } else {
        tiles[i] = T.WATER;
      }
    }
  }
}

function carveChannel(tiles, detail) {
  for (let ty = CHANNEL_Y0; ty <= CHANNEL_Y1; ty++) {
    const wobble = Math.round((fbm(detail, 77, ty * F(0.12), 3, 2, 0.5) - 0.5) * 3);
    for (let tx = CHANNEL_X0 + wobble - 1; tx <= CHANNEL_X1 + wobble + 1; tx++) {
      if (tx < 0 || tx >= MAP_W) continue;
      const i = tileIndex(tx, ty);
      const edge = tx < CHANNEL_X0 + wobble || tx > CHANNEL_X1 + wobble;
      if (edge) {
        // Felsufer, kein Strand. Sand an einer Wasserkante liest sich als
        // Meer; eine Schlucht hat Fels an den Seiten.
        if (tiles[i] === T.GRASS || tiles[i] === T.DIRT) tiles[i] = T.ROCKFLOOR;
      } else {
        tiles[i] = T.WATER;
      }
    }
  }
  // Brücken-Anlandungen: links und rechts vom Kanal fester Boden
  for (let ty = BRIDGE_Y0; ty <= BRIDGE_Y1; ty++) {
    for (let tx = CHANNEL_X0 - 3; tx < CHANNEL_X0; tx++) setLand(tiles, tx, ty, T.ROCKFLOOR);
    for (let tx = CHANNEL_X1 + 1; tx <= CHANNEL_X1 + 3; tx++) setLand(tiles, tx, ty, T.ROCKFLOOR);
  }
}

/** Der Sund: eine Wasserrinne über die volle Höhe, damit die Insel Insel bleibt. */
function carveSound(tiles, detail) {
  for (let ty = 0; ty < MAP_H; ty++) {
    const wobble = Math.round((fbm(detail, 313, ty * 0.11, 3, 2, 0.5) - 0.5) * 3);
    for (let tx = SOUND_X0 + wobble; tx <= SOUND_X1 + wobble; tx++) {
      if (tx < 0 || tx >= MAP_W) continue;
      tiles[tileIndex(tx, ty)] = T.WATER;
    }
  }
}

function setLand(tiles, tx, ty, t) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return;
  tiles[tileIndex(tx, ty)] = t;
}

function buildFord(tiles) {
  for (let tx = FORD_X0; tx <= FORD_X1; tx++) {
    for (let ty = RIVER_Y0 - 4; ty <= RIVER_Y1 + 4; ty++) {
      if (ty < 0 || ty >= MAP_H) continue;
      const i = tileIndex(tx, ty);
      if (ty >= RIVER_Y0 - 1 && ty <= RIVER_Y1 + 1) tiles[i] = T.DIRT;
      else if (tiles[i] === T.WATER || tiles[i] === T.WATER_DEEP) tiles[i] = T.SAND;
    }
  }
}

/**
 * Die Landengen der Stillen Insel aufschütten.
 *
 * Nur Wasser wird zu Land – vorhandenes Gras bleibt Gras. Sonst zöge sich
 * ein Sandstreifen quer über einen Kern, wo ohnehin schon Boden war, und man
 * sähe eine Straße statt einer Küste.
 *
 * Das Schlingern kommt aus demselben Rauschen wie bei Fluss und Kanal. Es
 * bleibt mit ±2 Kacheln kleiner als die halbe Breite, damit zwei benachbarte
 * Zeilen sich immer noch überlappen – eine Landenge, die um drei Kacheln
 * springt, ist zwei Landengen mit einer Lücke dazwischen.
 */
function buildIsthmus(tiles, detail) {
  for (let k = 0; k < ISTHMUS.length; k++) {
    const L = ISTHMUS[k];
    for (let ty = L.y0; ty <= L.y1; ty++) {
      const wobble = Math.round((fbm(detail, 501 + k * 37, ty * F(0.13), 3, 2, 0.5) - 0.5) * 4);
      const mitte = L.x + wobble;
      for (let tx = mitte - ISTHMUS_HALB; tx <= mitte + ISTHMUS_HALB; tx++) {
        if (tx < 1 || tx > ISLE_X1) continue;
        const i = tileIndex(tx, ty);
        if (tiles[i] === T.WATER || tiles[i] === T.WATER_DEEP) tiles[i] = T.SAND;
      }
    }
  }
}

function flattenCamp(tiles) {
  for (let ty = CAMP_TILE.y - 7; ty <= CAMP_TILE.y + 7; ty++) {
    for (let tx = CAMP_TILE.x - 9; tx <= CAMP_TILE.x + 9; tx++) {
      if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) continue;
      const i = tileIndex(tx, ty);
      // Ovale, leicht ausgefranste Feuerstelle – ein exaktes Rechteck sieht
      // aus wie ein Fehler, nicht wie ein Lagerplatz.
      const dx = (tx - CAMP_TILE.x) / 8.5;
      const dy = (ty - CAMP_TILE.y) / 6;
      const jitter = (makeRng(hashString(tx + '#' + ty))() - 0.5) * 0.26;
      const d = Math.sqrt(dx * dx + dy * dy) + jitter;
      if (d < 0.6) tiles[i] = T.DIRT;
      else if (!isWalkable(tiles[i])) tiles[i] = T.SAND;
    }
  }
}

/** Wo Gras direkt ans Wasser stößt, kommt ein Sandstreifen dazwischen. */
function addBeachRim(tiles) {
  const copy = tiles.slice();
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const i = tileIndex(tx, ty);
      if (copy[i] !== T.GRASS && copy[i] !== T.DIRT && copy[i] !== T.ROCKFLOOR) continue;
      let nearWater = false;
      for (let dy = -1; dy <= 1 && !nearWater; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = tx + dx;
          const ny = ty + dy;
          if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
          const t = copy[tileIndex(nx, ny)];
          if (t === T.WATER || t === T.WATER_DEEP) { nearWater = true; break; }
        }
      }
      if (nearWater) tiles[i] = T.SAND;
    }
  }
  // Tiefes Wasser weiter draußen
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const i = tileIndex(tx, ty);
      if (tiles[i] !== T.WATER) continue;
      let nearLand = false;
      for (let dy = -2; dy <= 2 && !nearLand; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = tx + dx;
          const ny = ty + dy;
          if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
          if (isWalkable(tiles[tileIndex(nx, ny)])) { nearLand = true; break; }
        }
      }
      if (!nearLand) tiles[i] = T.WATER_DEEP;
    }
  }
}

/** Sucht einen begehbaren Platz nahe einer Wunschposition. */
export function findWalkableNear(tiles, tx, ty, maxR, region) {
  for (let r = 0; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const nx = tx + dx;
        const ny = ty + dy;
        if (nx < 1 || ny < 1 || nx >= MAP_W - 1 || ny >= MAP_H - 1) continue;
        if (!isWalkable(tiles[tileIndex(nx, ny)])) continue;
        if (region != null && regionAt(nx, ny) !== region) continue;
        return { x: nx, y: ny };
      }
    }
  }
  return null;
}

/** Alle begehbaren Kacheln eines Bereichs (für zufällige Platzierungen). */
export function walkableTilesOf(tiles, region, filterFn) {
  const out = [];
  for (let ty = 2; ty < MAP_H - 2; ty++) {
    for (let tx = 2; tx < MAP_W - 2; tx++) {
      const t = tiles[tileIndex(tx, ty)];
      if (!isWalkable(t)) continue;
      if (region != null && regionAt(tx, ty) !== region) continue;
      if (filterFn && !filterFn(t, tx, ty)) continue;
      out.push({ x: tx, y: ty, t: t });
    }
  }
  return out;
}

/** Liefert die Startposition der Spielfigur in Weltpixeln. */
export function startPosition(tiles) {
  const spot = findWalkableNear(tiles, CAMP_TILE.x + 3, CAMP_TILE.y + 3, 12, REGION.CAMP);
  const p = spot || { x: CAMP_TILE.x, y: CAMP_TILE.y };
  return { x: (p.x + 0.5) * TILE_SIZE, y: (p.y + 0.5) * TILE_SIZE };
}

export { TILE_SIZE, randInt, randRange, makeRng };
