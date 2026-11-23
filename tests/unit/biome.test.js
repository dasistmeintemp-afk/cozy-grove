/**
 * Biome.
 *
 * Die Prüfungen hier sind nicht hübsch, sondern streng: Ein Biom, das
 * auf dem Papier existiert und sich auf der Insel nicht vom Nachbarn
 * unterscheidet, ist keins. Gemessen wird deshalb der BEWUCHS – was
 * wirklich dort steht, nicht was die Tabelle verspricht.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { World } from '../../src/world/world.js';
import { BIOM, BIOM_NAMEN, BIOME, biomeFuer, biomStand } from '../../src/world/biome.js';
import { generateTiles, tileIndex, MAP_W, MAP_H } from '../../src/world/worldgen.js';
import { T, TILE_SIZE, isWalkable } from '../../src/art/tiles.js';

const SEEDS = [11, 4711, 555, 20250907, 7];

test('Jede Insel hat jedes Biom', () => {
  // Eine Insel, auf der der Nadelwald fehlt, hat einen Ort weniger –
  // und man merkt es nie, weil nichts dort einen Hinweis gibt.
  for (const seed of SEEDS) {
    const tiles = generateTiles(seed);
    const stand = biomStand(biomeFuer(seed), tiles);
    let summe = 0;
    for (const k in stand) summe += stand[k];
    for (const k in BIOME) {
      assert.ok(stand[k] > summe * 0.015,
        'Seed ' + seed + ': ' + BIOM_NAMEN[k] + ' hat nur '
        + Math.round((stand[k] / summe) * 1000) / 10 + ' %');
    }
  }
});

test('Die Biome liegen in Flecken, nicht als Flickenteppich', () => {
  // Ein Biom, durch das man in fünf Schritten durch ist, ist kein Ort.
  // Gemessen wird, wie oft sich das Biom zwischen zwei Nachbarkacheln
  // ändert: Je seltener, desto größer die Flecken.
  for (const seed of SEEDS) {
    const tiles = generateTiles(seed);
    const karte = biomeFuer(seed);
    let kanten = 0;
    let paare = 0;
    for (let ty = 1; ty < MAP_H - 1; ty++) {
      for (let tx = 1; tx < MAP_W - 2; tx++) {
        const i = tileIndex(tx, ty);
        const j = tileIndex(tx + 1, ty);
        if (!isWalkable(tiles[i]) || !isWalkable(tiles[j])) continue;
        if (tiles[i] === T.SAND || tiles[j] === T.SAND) continue;
        paare++;
        if (karte[i] !== karte[j]) kanten++;
      }
    }
    const anteil = kanten / paare;
    // Unter 8 % heißt: im Mittel mindestens ein Dutzend Kacheln am Stück.
    assert.ok(anteil < 0.08, 'Seed ' + seed + ': ' + Math.round(anteil * 1000) / 10
      + ' % Biomwechsel je Schritt – das ist ein Flickenteppich');
  }
});

test('Im Birkenhain stehen wirklich überwiegend Birken', () => {
  // Das ist die Probe aufs Ganze: Die Tabelle sagt 11 zu 1 für die
  // Birke. Wenn auf der fertigen Insel dort trotzdem alles mögliche
  // steht, nützt die Tabelle nichts.
  for (const seed of SEEDS) {
    const welt = new World(seed).populate();
    const karte = biomeFuer(seed);
    let birken = 0;
    let andere = 0;
    for (const e of welt.entities) {
      if (e.gone || e.kind.indexOf('tree_') !== 0) continue;
      if (e.kind === 'tree_stump' || e.kind === 'tree_wind') continue;
      const i = tileIndex(Math.floor(e.x / TILE_SIZE), Math.floor(e.y / TILE_SIZE));
      if (karte[i] !== BIOM.BIRKENHAIN) continue;
      if (e.kind === 'tree_birch') birken++; else andere++;
    }
    assert.ok(birken + andere > 10, 'Seed ' + seed + ': fast keine Bäume im Birkenhain');
    assert.ok(birken > (birken + andere) * 0.75,
      'Seed ' + seed + ': nur ' + birken + ' von ' + (birken + andere) + ' Bäumen sind Birken');
  }
});

test('Die Heide ist offen, der Nadelwald dicht', () => {
  // Ohne eine Gegend, in der man WEIT sehen kann, ist eine Insel aus
  // Wald und Lichtung ein einziger Wald. Gemessen: Bäume je 100 Kacheln
  // im jeweiligen Biom.
  for (const seed of SEEDS) {
    const welt = new World(seed).populate();
    const karte = biomeFuer(seed);
    const flaeche = biomStand(karte, welt.tiles);
    const baeume = {};
    for (const e of welt.entities) {
      if (e.gone || e.kind.indexOf('tree_') !== 0 || e.kind === 'tree_stump') continue;
      const b = karte[tileIndex(Math.floor(e.x / TILE_SIZE), Math.floor(e.y / TILE_SIZE))];
      baeume[b] = (baeume[b] || 0) + 1;
    }
    const je100 = function (b) {
      return flaeche[b] > 40 ? ((baeume[b] || 0) / flaeche[b]) * 100 : null;
    };
    const heide = je100(BIOM.HEIDE);
    const wald = je100(BIOM.NADELWALD);
    if (heide == null || wald == null) continue;
    assert.ok(wald > heide * 2.5, 'Seed ' + seed + ': Nadelwald ' + Math.round(wald)
      + ' Bäume je 100 Kacheln, Heide ' + Math.round(heide) + ' – das ist kein Unterschied');
  }
});

test('Jedes Biom hat eine eigene Handschrift am Boden', () => {
  // Zwei Biome, die dasselbe Kleinzeug streuen, sind dasselbe Biom mit
  // zwei Namen. Geprüft wird die Tabelle selbst: Keine zwei Listen
  // dürfen gleich sein, und jede braucht einen eigenen Schwerpunkt.
  const gesehen = {};
  for (const k in BIOME) {
    const def = BIOME[k];
    assert.ok(def.boden.length >= 3, BIOM_NAMEN[k] + ': zu wenig Kleinzeug');
    const haupt = def.boden.slice().sort(function (a, b) { return b[1] - a[1]; })[0][0];
    const schluessel = def.boden.map(function (e) { return e[0]; }).sort().join('|');
    assert.ok(!gesehen[schluessel], BIOM_NAMEN[k] + ' streut dasselbe wie '
      + gesehen[schluessel]);
    gesehen[schluessel] = BIOM_NAMEN[k];
    assert.ok(haupt, BIOM_NAMEN[k] + ': kein Schwerpunkt');
  }
  // Und die Baumarten dürfen sich nicht alle gleichen.
  const ersten = Object.keys(BIOME).map(function (k) { return BIOME[k].baeume[0][0]; });
  assert.ok(new Set(ersten).size >= 3, 'fast alle Biome haben denselben Hauptbaum');
});
