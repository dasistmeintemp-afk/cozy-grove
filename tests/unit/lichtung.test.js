/**
 * Lichtungen.
 *
 * Die Dichte zu senken hat die Insel leerer gemacht, aber nicht
 * abwechslungsreicher: Es standen überall gleich viele Bäume, nur
 * weniger. Diese Prüfung misst nicht, WIE VIELE Bäume es gibt, sondern
 * wie ungleich sie liegen – denn genau das unterscheidet eine Landschaft
 * von einer Streuung.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { World } from '../../src/world/world.js';
import { MAP_W, MAP_H, tileIndex } from '../../src/world/worldgen.js';
import { TILE_SIZE, isWalkable } from '../../src/art/tiles.js';
import { ENTITY_DEFS } from '../../src/world/entities.js';

const SEEDS = [11, 4711, 555, 20250907];

/** Für jede begehbare Kachel: Bäume je 100 Kacheln im Umkreis von fünf. */
function umgebungsdichte(welt) {
  /**
   * Was als Baum zählt, steht in der Objekttabelle – nicht im Namen.
   *
   * Hier stand `e.kind.indexOf('tree_') !== 0`. Das war richtig, solange
   * jede Baumart `tree_` hiess. Mit den Klimazonen kamen Dschungelbaum,
   * Palme, Mangrove, Bambus und Säulenkaktus dazu, und keiner davon
   * fängt so an: Die DICHTESTEN Wälder des Spiels waren für diese
   * Prüfung unsichtbar. Sie hat daraufhin gemeldet, es gebe kein
   * Dickicht mehr – und das Dickicht stand direkt daneben.
   *
   * Ein Name ist kein Merkmal. `category: 'tree'` ist eins, und es ist
   * dasselbe, an dem auch die Setzlingsprüfung eine Baumart erkennt.
   */
  const baum = new Uint8Array(MAP_W * MAP_H);
  for (const e of welt.entities) {
    if (e.gone || !e.kind) continue;
    const def = ENTITY_DEFS[e.kind];
    if (!def || def.category !== 'tree') continue;
    baum[tileIndex(Math.floor(e.x / TILE_SIZE), Math.floor(e.y / TILE_SIZE))]++;
  }
  const werte = [];
  for (let ty = 6; ty < MAP_H - 6; ty++) {
    for (let tx = 6; tx < MAP_W - 6; tx++) {
      if (!isWalkable(welt.tiles[tileIndex(tx, ty)])) continue;
      let n = 0;
      let felder = 0;
      for (let dy = -5; dy <= 5; dy++) {
        for (let dx = -5; dx <= 5; dx++) {
          if (dx * dx + dy * dy > 25) continue;
          if (!isWalkable(welt.tiles[tileIndex(tx + dx, ty + dy)])) continue;
          felder++;
          n += baum[tileIndex(tx + dx, ty + dy)];
        }
      }
      // Kacheln dicht am Wasser haben zu wenig Umgebung, um etwas über
      // die Dichte zu sagen – sie würden jede Küste als Lichtung zählen.
      if (felder < 40) continue;
      werte.push((n / felder) * 100);
    }
  }
  werte.sort(function (a, b) { return a - b; });
  return werte;
}

test('Die Insel hat echte Lichtungen', () => {
  // Eine Lichtung ist eine Stelle, von der aus man WEIT sieht: im
  // Umkreis von fünf Kacheln fast kein Baum. Bei gleichmäßiger Streuung
  // waren das 24 % der Insel, und man merkte es nicht – die offenen
  // Stellen lagen einzeln zwischen den Bäumen statt am Stück.
  for (const seed of SEEDS) {
    const werte = umgebungsdichte(new World(seed).populate());
    const offen = werte.filter(function (v) { return v < 2; }).length / werte.length;
    assert.ok(offen > 0.3, 'Seed ' + seed + ': nur ' + Math.round(offen * 100)
      + ' % der Insel sind offen – überall stehen Bäume');
  }
});

test('Und trotzdem richtiges Dickicht', () => {
  // Die Gegenprobe. Eine Insel nur aus Lichtungen ist genauso eintönig
  // wie eine nur aus Wald: Ohne dichte Stellen gibt es nichts, aus dem
  // man herauskommt.
  for (const seed of SEEDS) {
    const werte = umgebungsdichte(new World(seed).populate());
    const dicht = werte[Math.floor(werte.length * 0.9)];
    assert.ok(dicht >= 8, 'Seed ' + seed + ': die dichtesten Stellen haben nur '
      + Math.round(dicht) + ' Bäume je 100 Kacheln – das ist kein Dickicht');
  }
});

/*
 * Was hier bewusst NICHT geprüft wird: ob die offenen Stellen am Stück
 * liegen. Das war die naheliegende dritte Messung – und sie misst
 * nichts. Mit und ohne Lichtungsfeld hat die Insel gleich viele
 * zusammenhängende freie Flächen ab 60 Kacheln (10 gegen 10, über vier
 * Inseln gemessen). Das Feld macht die offenen Stellen OFFENER, nicht
 * zusammenhängender, weil ohnehin alles über schmale Gassen verbunden
 * ist. Eine Prüfung, die bei abgeschaltetem Feld genauso grün ist,
 * behauptet etwas, das sie nicht zeigt.
 */
