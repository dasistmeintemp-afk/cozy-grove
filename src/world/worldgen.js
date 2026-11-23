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

export const MAP_W = 96;
export const MAP_H = 96;

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
export const RIVER_Y0 = 37;
export const RIVER_Y1 = 41;
export const FORD_X0 = 42;
export const FORD_X1 = 45;
export const CHANNEL_X0 = 59;
export const CHANNEL_X1 = 64;
export const CHANNEL_Y0 = 26;
export const CHANNEL_Y1 = 74;
export const BRIDGE_Y0 = 49;
export const BRIDGE_Y1 = 51;

export const CAMP_TILE = { x: 44, y: 62 };

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
export const SOUND_X0 = 17;
export const SOUND_X1 = 21;
/** Alles westlich davon gehört zur Stillen Insel. */
export const ISLE_X1 = 19;
/** Wo das Boot anlegt – Festlandseite und Inselseite. */
export const DOCK_TILE = { x: 24, y: 52 };
export const ISLE_DOCK_TILE = { x: 14, y: 52 };

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
  { x: 44, y: 60, r: 21 },   // Lager / Strand
  { x: 40, y: 20, r: 17 },   // Wald
  { x: 79, y: 50, r: 14 },   // Klippen
  { x: 8, y: 24, r: 12 },    // Stille Insel – das Hochland im Norden
  { x: 8, y: 46, r: 10 },    // Stille Insel – die Mitte, wo Wanda steht
  { x: 9, y: 67, r: 11 },    // Stille Insel – der Süden
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
const ISTHMUS = [
  { x: 8, y0: 30, y1: 42 },   // Hochland ↔ Mitte
  { x: 9, y0: 51, y1: 61 },   // Mitte ↔ Süden
];
/** Halbe Breite einer Landenge: fünf Kacheln plus Saum. */
const ISTHMUS_HALB = 2;

/**
 * Wo auf der Stillen Insel das Hochland beginnt.
 *
 * Nördlich davon wird aus Gras Felsboden, und dort steht das Erz, an das man
 * nur mit der dritten Spitzhackenstufe kommt. Ein Bereich, der aussieht wie
 * jeder andere, ist kein neuer Bereich.
 */
export const HIGHLAND_Y = 36;

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
      const wh = warp(detail, tx * 0.09, ty * 0.09, 1.1);
      const n = fbm(noise, wh[0], wh[1], 4, 2.0, 0.5) - 0.5;
      const h = land + n * 0.55;

      let t;
      if (h < -0.22) t = T.WATER_DEEP;
      else if (h < 0.02) t = T.WATER;
      else if (h < 0.12) t = T.SAND;
      else t = T.GRASS;

      // Felsboden auf den Klippen
      if (t === T.GRASS && tx > CHANNEL_X1) {
        const wr = warp(noise, tx * 0.14, ty * 0.14, 1.9);
        const rock = fbm(detail, wr[0], wr[1], 3, 2.0, 0.5);
        if (rock > 0.58) t = T.ROCKFLOOR;
      }
      // Das Hochland der Stillen Insel: hier überwiegt der Fels, sonst sähe
      // der Norden aus wie die Mitte und wäre kein eigener Ort.
      if (t === T.GRASS && tx <= ISLE_X1 && ty < HIGHLAND_Y) {
        const wh2 = warp(noise, tx * 0.13 + 200, ty * 0.13, 1.7);
        const fels = fbm(detail, wh2[0], wh2[1], 3, 2.0, 0.5);
        if (fels > 0.40) t = T.ROCKFLOOR;
      }
      // Trampelpfade / Lichtungen im Wald
      if (t === T.GRASS && ty < RIVER_Y0) {
        const wd = warp(noise, tx * 0.17 + 40, ty * 0.17, 1.9);
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
  setzeSteilkanten(tiles, hoehen);
  oeffneRampen(tiles);
  HOEHEN_CACHE.seed = seed >>> 0;
  HOEHEN_CACHE.data = hoehen;
  return tiles;
}

/* ---------------------------------------------------------- Höhenstufen */

/**
 * Wie viele Stufen es gibt. Zwei über dem Grundniveau, nicht mehr.
 *
 * Drei Ebenen ergeben schon ein Dutzend Wände und Rampen; bei vier wäre
 * die Insel ein Labyrinth aus Umwegen, und Umwege sind das Gegenteil von
 * gemütlich. Das Vorbild kommt mit zwei aus.
 */
export const MAX_STUFE = 2;

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
  const werte = [];
  const felder = [];
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const i = tileIndex(tx, ty);
      const t = tiles[i];
      if (t !== T.GRASS && t !== T.DIRT && t !== T.ROCKFLOOR) continue;
      if (nahAmLager(tx, ty) || amUebergang(tx, ty)) continue;
      const w = warp(n, tx * 0.055, ty * 0.055, 1.6);
      felder.push(i);
      werte.push(fbm(n, w[0], w[1], 3, 2.0, 0.5));
    }
  }
  if (!felder.length) return hoehen;

  // Die Schwellen werden GEMESSEN, nicht gesetzt.
  //
  // Mit festen Werten (0,555 und 0,645) schwankte das Ergebnis zwischen
  // den Samen von 2 bis 23 Prozent oberster Ebene: Das Rauschen trifft je
  // nach Samen einen anderen Wertebereich. Eine Insel mit 23 Prozent
  // Hochfläche ist ein Plateau mit Küstenstreifen, eine mit 2 Prozent hat
  // gar keine. Beides ist nicht dieses Spiel.
  //
  // Stattdessen werden alle Werte sortiert und bei ANTEILEN geschnitten.
  // Dann hat jede Insel dieselbe Mischung und trotzdem ihre eigene Form.
  const sortiert = werte.slice().sort(function (a, b) { return a - b; });
  const s1 = sortiert[Math.floor(sortiert.length * 0.46)];
  const s2 = sortiert[Math.floor(sortiert.length * 0.76)];
  for (let k = 0; k < felder.length; k++) {
    const v = werte[k];
    hoehen[felder[k]] = v > s2 ? 2 : v > s1 ? 1 : 0;
  }
  glaetteHoehen(hoehen, tiles);
  return hoehen;
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
  { x: CAMP_TILE.x, y: CAMP_TILE.y, hx: 17, hy: 12 },
  { x: 9, y: 60, hx: 10, hy: 16 },
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
      if (hoeher) tiles[i] = T.CLIFF;
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

function carveRiver(tiles, detail) {
  for (let tx = 0; tx < MAP_W; tx++) {
    const wobble = Math.round((fbm(detail, tx * 0.12, 99, 3, 2, 0.5) - 0.5) * 3);
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
    const wobble = Math.round((fbm(detail, 77, ty * 0.12, 3, 2, 0.5) - 0.5) * 3);
    for (let tx = CHANNEL_X0 + wobble - 1; tx <= CHANNEL_X1 + wobble + 1; tx++) {
      if (tx < 0 || tx >= MAP_W) continue;
      const i = tileIndex(tx, ty);
      const edge = tx < CHANNEL_X0 + wobble || tx > CHANNEL_X1 + wobble;
      if (edge) {
        if (tiles[i] === T.GRASS || tiles[i] === T.ROCKFLOOR || tiles[i] === T.DIRT) tiles[i] = T.SAND;
      } else {
        tiles[i] = T.WATER;
      }
    }
  }
  // Brücken-Anlandungen: links und rechts vom Kanal fester Boden
  for (let ty = BRIDGE_Y0; ty <= BRIDGE_Y1; ty++) {
    for (let tx = CHANNEL_X0 - 3; tx < CHANNEL_X0; tx++) setLand(tiles, tx, ty, T.SAND);
    for (let tx = CHANNEL_X1 + 1; tx <= CHANNEL_X1 + 3; tx++) setLand(tiles, tx, ty, T.SAND);
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
      const wobble = Math.round((fbm(detail, 501 + k * 37, ty * 0.13, 3, 2, 0.5) - 0.5) * 4);
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
