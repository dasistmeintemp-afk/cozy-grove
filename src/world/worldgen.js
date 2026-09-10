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
  return tiles;
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
