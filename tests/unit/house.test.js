/**
 * Vom Zelt zum Haus.
 *
 * Die dritte lange Reihe neben Vorratstruhe und Grundstück, und bewusst in
 * einer dritten Währung: Material. Die Tests halten fest, dass die Leiter
 * wirklich steigt, dass die Kosten aus Dingen bestehen, die es im Spiel
 * gibt – und dass Grafik, Kollision und Reichweite zusammen mitwachsen.
 * Letzteres ist kein Schönheitsfehler, wenn es auseinanderläuft: Man liefe
 * durch die eigene Wand oder käme nicht mehr an die eigene Tür.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HOUSE_STAGES, MAX_HOUSE_STAGE, houseStage, nextHouseStage, houseSprite,
  houseLight, houseColor, houseFootprint, missingFor, canBuild, houseStatus,
} from '../../src/game/house.js';
import { getItem } from '../../src/game/items.js';
import { Inventory } from '../../src/game/inventory.js';

test('Die Stufen steigen in jeder Hinsicht', () => {
  let licht = -1;
  let farbe = -1;
  let menge = -1;
  for (const st of HOUSE_STAGES) {
    assert.ok(st.name && st.note, st.id + ' braucht Name und Zeile');
    assert.ok(st.sprite, st.id + ' braucht eine Grafik');
    assert.ok(st.light > licht, st.id + ': leuchtet nicht weiter');
    assert.ok(st.color > farbe, st.id + ': färbt nicht weiter');
    licht = st.light;
    farbe = st.color;

    // Material insgesamt, nicht je Zutat: Stufe 4 lässt Holz weg und
    // verlangt dafür Hartholz – teurer wird sie trotzdem.
    let summe = 0;
    for (const c of st.cost) summe += c.n;
    assert.ok(summe > menge, st.id + ': kostet nicht mehr als die Stufe davor');
    menge = summe;
  }
  assert.equal(HOUSE_STAGES[0].cost.length, 0, 'im Zelt wohnt man von Anfang an');
  assert.equal(HOUSE_STAGES[0].light, 0, 'ein Zelt leuchtet nicht');
  assert.equal(MAX_HOUSE_STAGE, HOUSE_STAGES.length);
});

test('Jede Zutat gibt es wirklich', () => {
  for (const st of HOUSE_STAGES) {
    for (const c of st.cost) {
      assert.ok(getItem(c.id), st.name + ' verlangt ' + c.id + ', das es nicht gibt');
      assert.ok(c.n > 0, st.name + ': ' + c.id + ' ohne Menge');
    }
  }
});

test('Die letzte Stufe ist die letzte', () => {
  assert.equal(nextHouseStage(MAX_HOUSE_STAGE), null);
  assert.equal(houseStage(99), null);
  assert.equal(houseStatus(MAX_HOUSE_STAGE).fertig, true);
  assert.equal(houseStatus(1).fertig, false);
  // Ohne Angabe steht man im Zelt, nicht im Nichts.
  assert.equal(houseSprite(), 'tent');
  assert.equal(houseLight(), 0);
  assert.equal(houseColor(), 0);
  assert.equal(houseSprite(99), 'tent');
});

test('Der Fußabdruck wächst mit der Grafik', () => {
  let block = -1;
  let reich = -1;
  for (const st of HOUSE_STAGES) {
    const f = houseFootprint(st.id);
    assert.ok(f.blockR > block, st.name + ': blockiert nicht mehr Platz');
    assert.ok(f.reachR > reich, st.name + ': man käme nicht an die Tür');
    // Reichweite muss über den Block hinausgehen, sonst steht man in der
    // Wand, bevor man sie anfassen kann.
    assert.ok(f.reachR > f.blockR + 24, st.name + ': Reichweite endet zu früh');
    block = f.blockR;
    reich = f.reachR;
  }
  // Auch eine unbekannte Stufe liefert Maße – sonst stünde da undefined
  // in der Kollisionsrechnung.
  assert.equal(houseFootprint(99).blockR, HOUSE_STAGES[0].blockR);
});

test('Was fehlt, steht einzeln da', () => {
  const tasche = new Inventory(30);
  const stufe2 = HOUSE_STAGES[1];

  let fehlt = missingFor(1, tasche);
  assert.equal(fehlt.length, stufe2.cost.length, 'leere Tasche: alles fehlt');
  assert.equal(canBuild(1, tasche), false);

  // Alles bis auf eine Zutat besorgen
  for (let i = 1; i < stufe2.cost.length; i++) {
    tasche.add(stufe2.cost[i].id, stufe2.cost[i].n);
  }
  fehlt = missingFor(1, tasche);
  assert.equal(fehlt.length, 1, 'genau eine Zutat fehlt noch');
  assert.equal(fehlt[0].id, stufe2.cost[0].id);
  assert.equal(fehlt[0].have, 0);
  assert.equal(canBuild(1, tasche), false);

  // Eins zu wenig ist immer noch zu wenig
  tasche.add(stufe2.cost[0].id, stufe2.cost[0].n - 1);
  assert.equal(missingFor(1, tasche).length, 1, 'eins zu wenig zählt als fehlend');

  tasche.add(stufe2.cost[0].id, 1);
  assert.equal(missingFor(1, tasche).length, 0);
  assert.equal(canBuild(1, tasche), true);
});

test('Auf der letzten Stufe fehlt nichts mehr', () => {
  const tasche = new Inventory(30);
  assert.deepEqual(missingFor(MAX_HOUSE_STAGE, tasche), []);
  assert.equal(canBuild(MAX_HOUSE_STAGE, tasche), false, 'fertig heißt nicht baubar');
});
