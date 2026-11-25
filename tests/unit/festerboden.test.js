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

/**
 * Was gross genug ist, um zu tragen – dieselbe Grenze wie `festerBoden`.
 *
 * Hier stand vorher „die ersten DREI Massen sind Land, alles danach ist
 * Fetzen". Die Drei war richtig, solange die Welt aus Festland, Klippen
 * und Stiller Insel bestand; seit die Stille Insel in zwei kleine Inseln
 * zerlegt ist, sind es vier – und die Prüfung hätte eine davon als
 * Sandbank behandelt. Eine getippte Zahl ist eine Annahme über die
 * Weltform; abgeleitet ist sie eine Aussage über die Regel.
 */
const MINDEST = 200;
test('Sandbänke gelten nicht als fester Boden', () => {
  // Die eigentliche Prüfung: Jede Kachel jedes abgetrennten Fetzens
  // muss abgelehnt werden. Nicht „die meisten" – jede einzelne, denn
  // die Rettung setzt die Figur auf genau eine davon.
  let geprueft = 0;
  for (const seed of SEEDS) {
    const welt = new World(seed).populate();
    const massen = landmassen(welt).filter(function (m) { return m.length < MINDEST; });
    for (let m = 0; m < massen.length; m++) {
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
    const massen = landmassen(welt).filter(function (m) { return m.length >= MINDEST; });
    for (let m = 0; m < massen.length; m++) {
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
  // nichts in der Nähe dieser Zahl gibt. Verschiebt sich das einmal,
  // ist die Grenze geraten statt gemessen – und diese Prüfung sagt es,
  // bevor jemand wieder im Wasser steht.
  //
  // Gemessen über fünf Inselwürfe, alle Massen der Grösse nach:
  //
  //   5734 2309 720 494 | 99 4 1
  //   5792 2551 677 531 |
  //   5606 2405 697 519 | 105
  //   5478 2562 694 568 |
  //   5454 2454 742 555 | 83 1
  //
  // Vier echte Massen, dann nichts mehr bis 105. Die Grenze liegt mit
  // Abstand nach beiden Seiten dazwischen.
  for (const seed of SEEDS) {
    const alle = landmassen(new World(seed).populate()).map(function (m) { return m.length; });
    const echt = alle.filter(function (n) { return n >= MINDEST; });
    const fetzen = alle.filter(function (n) { return n < MINDEST; });
    assert.ok(echt[echt.length - 1] > 350, 'Seed ' + seed
      + ': die kleinste Landmasse hat nur ' + echt[echt.length - 1]
      + ' Kacheln – zu nah an der Grenze von ' + MINDEST);
    if (fetzen.length) {
      assert.ok(fetzen[0] < 150, 'Seed ' + seed + ': ein Fetzen hat ' + fetzen[0]
        + ' Kacheln – zu nah an der Grenze von ' + MINDEST);
    }
  }
});

test('Die Welt ist ein grosses Land, die Klippen und zwei Inseln', () => {
  /**
   * Die Form der Welt, als Zahl.
   *
   * Sie ist eine Entscheidung und keine Folge: EIN grosses Land, dahinter
   * die Klippen hinter der Schlucht, und zwei kleine Inseln. Vorher war
   * es ein Archipel – drei Massen zu 60, 26 und 14 Prozent, und die
   * dritte bestand selbst wieder aus drei Scheiben an zwei Landengen.
   *
   * Dass das Land GROSS ist, steht in der zweiten Zusicherung: Ohne sie
   * wären auch vier gleich grosse Inseln „vier Massen".
   */
  for (const seed of SEEDS) {
    const alle = landmassen(new World(seed).populate()).map(function (m) { return m.length; });
    const echt = alle.filter(function (n) { return n >= MINDEST; });
    assert.equal(echt.length, 4, 'Seed ' + seed + ': ' + echt.length
      + ' Landmassen statt vier – ' + echt.join(', '));
    const ges = echt.reduce(function (a, c) { return a + c; }, 0);
    assert.ok(echt[0] / ges > 0.5, 'Seed ' + seed + ': die grösste Masse trägt nur '
      + Math.round(echt[0] / ges * 100) + ' Prozent – das ist kein Land mit Inseln');
    const inseln = echt[2] + echt[3];
    assert.ok(inseln / ges < 0.2, 'Seed ' + seed + ': die beiden Inseln machen '
      + Math.round(inseln / ges * 100) + ' Prozent aus – das sind Festländer');
  }
});
