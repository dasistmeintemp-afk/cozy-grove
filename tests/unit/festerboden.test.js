/**
 * Fester Boden.
 *
 * Eine Spielerin stand auf einer Sandbank mitten im Wasser: Sie konnte
 * laufen, drei Schritte weit, und kam nirgends hin. Die Rettung für
 * alte Spielstände hatte sie dort abgesetzt, weil sie nur nach einer
 * BEGEHBAREN Kachel gesucht hatte.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { World } from '../../src/world/world.js';
import { MAP_W, MAP_H, tileIndex, CAMP_TILE } from '../../src/world/worldgen.js';
import { TILE_SIZE, isWalkable } from '../../src/art/tiles.js';

const SEEDS = [11, 4711, 555, 20250907, 7];

/** Alle Landmassen einer Insel, größte zuerst. */
function landmassen(welt) {
  const gesehen = new Uint8Array(MAP_W * MAP_H);
  const massen = [];
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const i0 = tileIndex(tx, ty);
      if (gesehen[i0] || !isWalkable(welt.tiles[i0])) continue;
      const masse = [[tx, ty]];
      const stapel = [tx, ty];
      gesehen[i0] = 1;
      while (stapel.length) {
        const y = stapel.pop();
        const x = stapel.pop();
        const nachbarn = [x + 1, y, x - 1, y, x, y + 1, x, y - 1];
        for (let k = 0; k < 8; k += 2) {
          const nx = nachbarn[k];
          const ny = nachbarn[k + 1];
          if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
          const i = tileIndex(nx, ny);
          if (gesehen[i] || !isWalkable(welt.tiles[i])) continue;
          gesehen[i] = 1;
          masse.push([nx, ny]);
          stapel.push(nx, ny);
        }
      }
      massen.push(masse);
    }
  }
  massen.sort(function (a, b) { return b.length - a.length; });
  return massen;
}

test('Sandbänke gelten nicht als fester Boden', () => {
  // Die eigentliche Prüfung: Jede Kachel jedes abgetrennten Fetzens
  // muss abgelehnt werden. Nicht „die meisten" – jede einzelne, denn
  // die Rettung setzt die Figur auf genau eine davon.
  let geprueft = 0;
  for (const seed of SEEDS) {
    const welt = new World(seed).populate();
    const massen = landmassen(welt);
    // Die drei großen Landmassen sind das Festland, alles danach Fetzen.
    for (let m = 3; m < massen.length; m++) {
      for (const [tx, ty] of massen[m]) {
        geprueft++;
        assert.equal(welt.festerBoden((tx + 0.5) * TILE_SIZE, (ty + 0.5) * TILE_SIZE), false,
          'Seed ' + seed + ': Kachel ' + tx + '/' + ty + ' gehört zu einem Fetzen von '
          + massen[m].length + ' Kacheln und gilt trotzdem als fester Boden');
      }
    }
  }
  assert.ok(geprueft > 20, 'nur ' + geprueft
    + ' Fetzenkacheln geprüft – ohne Fetzen beweist die Prüfung nichts');
});

test('Das Festland gilt als fester Boden', () => {
  // Die Gegenprobe. Eine Grenze, die zu scharf ist, wirft die Figur
  // vom Hochland oder von der Stillen Insel ans Lager zurück.
  for (const seed of SEEDS) {
    const welt = new World(seed).populate();
    const massen = landmassen(welt);
    for (let m = 0; m < 3; m++) {
      for (const [tx, ty] of massen[m]) {
        assert.equal(welt.festerBoden((tx + 0.5) * TILE_SIZE, (ty + 0.5) * TILE_SIZE), true,
          'Seed ' + seed + ': Landmasse ' + m + ' (' + massen[m].length
          + ' Kacheln) gilt nicht als fester Boden');
      }
    }
    assert.equal(welt.festerBoden((CAMP_TILE.x + 0.5) * TILE_SIZE,
      (CAMP_TILE.y + 0.5) * TILE_SIZE), true, 'Seed ' + seed + ': das Lager selbst trägt nicht');
  }
});

test('Zwischen Fetzen und Festland liegt eine Lücke', () => {
  // Warum 200 Kacheln als Grenze überhaupt zulässig sind: Weil es
  // nichts in der Nähe dieser Zahl gibt. Der größte Fetzen hat 72
  // Kacheln, die kleinste echte Landmasse 883. Verschiebt sich das
  // einmal, ist die Grenze geraten statt gemessen – und diese Prüfung
  // sagt es, bevor jemand wieder im Wasser steht.
  for (const seed of SEEDS) {
    const massen = landmassen(new World(seed).populate()).map(function (m) { return m.length; });
    assert.ok(massen[2] > 600, 'Seed ' + seed + ': die dritte Landmasse hat nur '
      + massen[2] + ' Kacheln – zu nah an der Grenze von 200');
    if (massen.length > 3) {
      assert.ok(massen[3] < 120, 'Seed ' + seed + ': ein Fetzen hat ' + massen[3]
        + ' Kacheln – zu nah an der Grenze von 200');
    }
  }
});
