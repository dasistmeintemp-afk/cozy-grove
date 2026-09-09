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
import { CAMP_TILE, MAP_W, MAP_H, TILE_SIZE, regionAt, REGION } from '../world/worldgen.js';

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
  { id: 2, name: 'Der Hinterhof', halfW: 10, halfH: 7, ember: 40,
    note: 'Ein Stück mehr nach hinten hinaus.' },
  { id: 3, name: 'Der Garten', halfW: 13, halfH: 9, ember: 120,
    note: 'Genug für Beete, Wege und eine Bank am Rand.' },
  { id: 4, name: 'Das Anwesen', halfW: 16, halfH: 11, ember: 300,
    note: 'So weit, wie das Lager reicht.' },
];

export const MAX_PLOT_STAGE = PLOT_STAGES.length;

export function plotStage(n) {
  for (let i = 0; i < PLOT_STAGES.length; i++) {
    if (PLOT_STAGES[i].id === n) return PLOT_STAGES[i];
  }
  return null;
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
  const b = plotBounds(stage);
  let n = 0;
  for (let ty = b.y0; ty <= b.y1; ty++) {
    for (let tx = b.x0; tx <= b.x1; tx++) {
      if (regionAt(tx, ty) !== REGION.CAMP) continue;
      if (world.isWalkableTile ? !world.isWalkableTile(tx, ty) : false) continue;
      n++;
    }
  }
  return n;
}

export { CAMP_TILE, TILE_SIZE };
