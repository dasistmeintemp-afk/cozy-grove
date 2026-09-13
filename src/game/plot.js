/**
 * Das Grundstück – der Platz, der dir gehört.
 *
 * Gemessen war das Problem nicht die Fläche, sondern zweierlei:
 *
 * 1. **Sie ist zerstückelt.** Vom Lagerbereich sind über achtzig Prozent der
 *    Kacheln frei, aber das größte zusammenhängende freie Quadrat misst über
 *    drei Seeds hinweg nur sechs bis sieben Kacheln. Für einen Garten mit
 *    Weg und Bank ist das nichts.
 * 2. **Was man rodet, kommt zurück.** Rund 190 Kacheln im Lager sind von
 *    Bäumen, Büschen und Findlingen belegt, die alle nachwachsen. Wer sich
 *    Platz schafft, findet ihn drei Tage später wieder zugewachsen.
 *
 * Das Grundstück löst beides mit einer Regel: **Innerhalb wächst nichts
 * nach.** Was du hier fällst, bleibt gefällt; was der Zufall sonst
 * ausstreut, lässt diesen Rechteck aus. Aus sechs mal sechs Kacheln
 * Stückwerk wird damit ein Bauplatz, den du dir selbst freiräumst.
 *
 * Bewusst KEIN zweiter Ort: Das Grundstück liegt um das Zelt herum. Ein
 * Lager, das man sich woanders absteckt, hieße zwei Lager – eines mit
 * Feuer, Werkbank und Händler, und eines, das man selbst gebaut hat.
 */
import { CAMP_TILE, MAP_W, MAP_H, TILE_SIZE, regionAt, REGION, tileIndex } from '../world/worldgen.js';
import { isWalkable } from '../art/tiles.js';

/**
 * Die Ausbaustufen des Grundstücks.
 *
 * `halfW`/`halfH` sind die halben Kantenlängen in Kacheln, gemessen vom
 * Zelt aus. Die erste Stufe ist die Lichtung, die ohnehin schon da ist; die
 * letzte umfasst rund ein Viertel des Lagerbereichs.
 *
 * Bezahlt wird in Glut, nicht in Münzen: Münzen haben mit der Vorratstruhe
 * schon ein großes Ziel, und Glut hatte bisher nur das Lagerfeuer und die
 * Werkbank. So ziehen beide Währungen an etwas.
 */
export const PLOT_STAGES = [
  { id: 1, name: 'Die Lichtung', halfW: 7, halfH: 5, ember: 0,
    note: 'Der Platz, der ohnehin dir gehört.' },
  { id: 2, name: 'Der Hinterhof', halfW: 10, halfH: 7, ember: 120,
    note: 'Ein Stück mehr nach hinten hinaus.' },
  { id: 3, name: 'Der Garten', halfW: 13, halfH: 9, ember: 400,
    note: 'Genug für Beete, Wege und eine Bank am Rand.' },
  { id: 4, name: 'Das Anwesen', halfW: 16, halfH: 11, ember: 1100,
    note: 'So weit, wie das Lager reicht.' },
];

export const MAX_PLOT_STAGE = PLOT_STAGES.length;

/**
 * Der zweite Bauplatz: die Bucht auf der Stillen Insel.
 *
 * Das Lager ist gewachsen, aber es bleibt das Lager – mit Feuer, Werkbank,
 * Händler und Briefkasten mitten darin. Wer sich etwas Eigenes hinstellen
 * will, baut zwischen fremden Möbeln. Die Insel hat beides nicht: keinen
 * Betrieb und, seit sie drei Kerne hat, Platz.
 *
 * Bezahlt wird in **Münzen** – die dritte Währung an der dritten Sache.
 * Glut zieht am Lagergrundstück, Material am Haus, Münzen bislang nur an
 * Truhe und Katalog. Und es ist der einzige Kauf, der nach oben offen ist:
 * 800 bis 6000 sind ein Grund, einen guten Markttag gut zu finden.
 *
 * Der Mittelpunkt ist gemessen, nicht geraten: Über acht Seeds hinweg ist
 * das Rechteck um (9|60) zu rund drei Vierteln Land, und das ist der beste
 * Wert, den die schmale Insel hergibt.
 */
export const ISLE_PLOT_TILE = { x: 9, y: 60 };

export const ISLE_PLOT_STAGES = [
  { id: 1, name: 'Die Bucht', halfW: 6, halfH: 7, coins: 1000,
    note: 'Ein Stück Ufer, das dir gehört.' },
  { id: 2, name: 'Der Hain', halfW: 7, halfH: 10, coins: 3000,
    note: 'Bis an die Kiefern heran.' },
  { id: 3, name: 'Die Wiese', halfW: 8, halfH: 12, coins: 7500,
    note: 'Genug für einen Garten, der etwas darstellt.' },
  { id: 4, name: 'Die ganze Bucht', halfW: 9, halfH: 15, coins: 16000,
    note: 'Von der Landzunge bis zum Wald.' },
];

export const MAX_ISLE_PLOT_STAGE = ISLE_PLOT_STAGES.length;

export function plotStage(n) {
  for (let i = 0; i < PLOT_STAGES.length; i++) {
    if (PLOT_STAGES[i].id === n) return PLOT_STAGES[i];
  }
  return null;
}

export function islePlotStage(n) {
  for (let i = 0; i < ISLE_PLOT_STAGES.length; i++) {
    if (ISLE_PLOT_STAGES[i].id === n) return ISLE_PLOT_STAGES[i];
  }
  return null;
}

/** Die nächste Ausbaustufe der Bucht – oder null, wenn alles steht. */
export function nextIslePlotStage(stage) {
  return islePlotStage((stage || 0) + 1);
}

/**
 * Die Grenzen der Bucht. Stufe 0 heißt: noch nicht gekauft, es gibt sie
 * nicht – und dann darf auch nichts sie ausnehmen.
 */
export function islePlotBounds(stage) {
  const s = islePlotStage(stage || 0);
  if (!s) return null;
  return {
    x0: Math.max(1, ISLE_PLOT_TILE.x - s.halfW),
    y0: Math.max(1, ISLE_PLOT_TILE.y - s.halfH),
    x1: Math.min(MAP_W - 2, ISLE_PLOT_TILE.x + s.halfW),
    y1: Math.min(MAP_H - 2, ISLE_PLOT_TILE.y + s.halfH),
  };
}

export function inIslePlot(tx, ty, stage) {
  const b = islePlotBounds(stage);
  if (!b) return false;
  return tx >= b.x0 && tx <= b.x1 && ty >= b.y0 && ty <= b.y1;
}

export function inIslePlotAt(px, py, stage) {
  return inIslePlot(Math.floor(px / TILE_SIZE), Math.floor(py / TILE_SIZE), stage);
}

export function islePlotRect(stage) {
  const b = islePlotBounds(stage);
  if (!b) return null;
  return {
    x: b.x0 * TILE_SIZE,
    y: b.y0 * TILE_SIZE,
    w: (b.x1 - b.x0 + 1) * TILE_SIZE,
    h: (b.y1 - b.y0 + 1) * TILE_SIZE,
  };
}

/**
 * Liegt die Kachel auf IRGENDEINEM eigenen Grundstück?
 *
 * Die Regel „hier wächst nichts nach" gilt für beide gleich. Sie an zwei
 * Stellen einzeln zu prüfen hieße, sie beim nächsten Bauplatz ein drittes
 * Mal zu schreiben und eine davon zu vergessen.
 */
export function inAnyPlot(tx, ty, plot, islePlot) {
  return inPlot(tx, ty, plot) || inIslePlot(tx, ty, islePlot);
}

export function inAnyPlotAt(px, py, plot, islePlot) {
  const tx = Math.floor(px / TILE_SIZE);
  const ty = Math.floor(py / TILE_SIZE);
  return inAnyPlot(tx, ty, plot, islePlot);
}

/** Die nächste Ausbaustufe – oder null, wenn alles steht. */
export function nextPlotStage(stage) {
  return plotStage((stage || 1) + 1);
}

/**
 * Die Grenzen des Grundstücks in Kacheln: { x0, y0, x1, y1 }, beide Enden
 * eingeschlossen.
 */
export function plotBounds(stage) {
  const s = plotStage(stage || 1) || PLOT_STAGES[0];
  return {
    x0: Math.max(1, CAMP_TILE.x - s.halfW),
    y0: Math.max(1, CAMP_TILE.y - s.halfH),
    x1: Math.min(MAP_W - 2, CAMP_TILE.x + s.halfW),
    y1: Math.min(MAP_H - 2, CAMP_TILE.y + s.halfH),
  };
}

/** Liegt diese Kachel auf dem Grundstück? */
export function inPlot(tx, ty, stage) {
  const b = plotBounds(stage);
  return tx >= b.x0 && tx <= b.x1 && ty >= b.y0 && ty <= b.y1;
}

/** Dasselbe in Weltpixeln. */
export function inPlotAt(px, py, stage) {
  return inPlot(Math.floor(px / TILE_SIZE), Math.floor(py / TILE_SIZE), stage);
}

/** Die Grenzen in Weltpixeln – für die Umrandung im Bild. */
export function plotRect(stage) {
  const b = plotBounds(stage);
  return {
    x: b.x0 * TILE_SIZE,
    y: b.y0 * TILE_SIZE,
    w: (b.x1 - b.x0 + 1) * TILE_SIZE,
    h: (b.y1 - b.y0 + 1) * TILE_SIZE,
  };
}

/**
 * Wie viele Kacheln des Grundstücks überhaupt Land sind.
 *
 * Das Rechteck reicht bis ans Wasser: Wer die Zahl „so groß ist dein
 * Grundstück" liest, meint den Boden, auf dem er stehen kann, nicht die
 * Bucht am Rand.
 */
export function usableTiles(world, stage) {
  return countLand(world, plotBounds(stage), REGION.CAMP);
}

/** Dasselbe für die Bucht auf der Insel. */
export function usableIsleTiles(world, stage) {
  return countLand(world, islePlotBounds(stage), REGION.ISLE);
}

/* --------------------------------------------------------------- Der Umzug */

/**
 * Wo das Zuhause im Lager steht – dieselbe Kachel, an die `_placeCamp` es
 * setzt. Der Briefkasten steht daneben und zieht mit um: Post gehört ans
 * Haus, nicht an einen Ort.
 */
export const HOME_CAMP_TILE = { x: CAMP_TILE.x - 5, y: CAMP_TILE.y - 2 };
export const MAILBOX_OFFSET = { x: -2, y: 1 };

/** Ist rings um diese Kachel Land – und zwar im richtigen Bereich? */
function freiRundum(world, tx, ty, halbW, halbH, region) {
  for (let y = ty - halbH; y <= ty + halbH; y++) {
    for (let x = tx - halbW; x <= tx + halbW; x++) {
      if (x < 1 || y < 1 || x >= MAP_W - 1 || y >= MAP_H - 1) return false;
      if (regionAt(x, y) !== region) return false;
      if (!isWalkable(world.tiles[tileIndex(x, y)])) return false;
    }
  }
  return true;
}

/**
 * Der Bauplatz für das Haus in der Bucht.
 *
 * Von der Mitte nach außen gesucht, und verlangt wird ein freies Feld
 * ringsum statt einer einzelnen begehbaren Kachel: Das Haus ist auf der
 * letzten Stufe fast sechs Kacheln breit, am Ufer stünde es halb im Wasser.
 * Gesucht wird nur innerhalb der ERSTEN Ausbaustufe – wer die Bucht kauft,
 * soll sofort einziehen können und nicht erst weiter ausbauen müssen.
 */
export function isleHomeTile(world) {
  if (!world || !world.tiles) return null;
  const b = islePlotBounds(1);
  if (!b) return null;
  for (let r = 0; r <= 8; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const tx = ISLE_PLOT_TILE.x + dx;
        const ty = ISLE_PLOT_TILE.y + dy;
        if (tx < b.x0 || tx > b.x1 || ty < b.y0 || ty > b.y1) continue;
        if (!freiRundum(world, tx, ty, 2, 1, REGION.ISLE)) continue;
        if (!freiRundum(world, tx + MAILBOX_OFFSET.x, ty + MAILBOX_OFFSET.y, 1, 1, REGION.ISLE)) continue;
        return { x: tx, y: ty };
      }
    }
  }
  return null;
}

/** Wo das Zuhause steht: `'camp'` oder `'isle'`. */
export function homeTile(world, wo) {
  if (wo !== 'isle') return HOME_CAMP_TILE;
  return isleHomeTile(world) || HOME_CAMP_TILE;
}

/**
 * Zählt begehbare Kacheln in einem Rechteck.
 *
 * Vorher stand hier `world.isWalkableTile ? … : false` – und die Methode gibt
 * es gar nicht. Der Ausdruck war also immer `false`, es wurde nie etwas
 * übersprungen, und Wasser zählte als Bauland. Genau die Zahl, die sagen
 * soll „so viel Boden hast du", war die Fläche des Rechtecks.
 */
function countLand(world, b, region) {
  if (!b || !world || !world.tiles) return 0;
  let n = 0;
  for (let ty = b.y0; ty <= b.y1; ty++) {
    for (let tx = b.x0; tx <= b.x1; tx++) {
      if (regionAt(tx, ty) !== region) continue;
      if (!isWalkable(world.tiles[tileIndex(tx, ty)])) continue;
      n++;
    }
  }
  return n;
}

export { CAMP_TILE, TILE_SIZE };
