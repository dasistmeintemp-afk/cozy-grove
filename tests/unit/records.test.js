/**
 * Fanggrößen und Lieblingsgeschenke – zwei Tiefenschichten für Dinge, die
 * vorher nur eine Ebene hatten.
 *
 * Vorher war jede Sardine dieselbe Sardine und jedes gemochte Ding gleich
 * viel wert. Beides war nicht falsch, nur flach: Man hakte den Fisch einmal
 * ab und warf dem Geist hin, was oben in der Tasche lag.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  rollSize, noteSize, bestSize, sizeWord, spanneFuer, emptyRecords, recordCount,
} from '../../src/game/records.js';
import { ITEM_LIST, getItem, CAT } from '../../src/game/items.js';
import { SPIRITS, SPIRIT_IDS, favouriteOf, isFavourite } from '../../src/game/spirits.js';
import { makeRng } from '../../src/core/rng.js';

test('Jeder Fisch hat eine Spanne, und seltenere werden größer', () => {
  const fische = ITEM_LIST.filter((i) => i.cat === CAT.FISH);
  assert.ok(fische.length >= 8);
  let vorher = 0;
  const nachSeltenheit = fische.slice().sort((a, b) => a.rarity - b.rarity);
  for (const f of nachSeltenheit) {
    const sp = spanneFuer(f.id);
    assert.ok(sp[1] > sp[0], f.id + ': Spanne verkehrt herum');
    assert.ok(sp[1] >= vorher, f.id + ': wird nicht größer als der seltenere davor');
    vorher = sp[1];
  }
});

test('Ein Maß liegt immer in der Spanne', () => {
  for (const f of ITEM_LIST.filter((i) => i.cat === CAT.FISH)) {
    const sp = spanneFuer(f.id);
    for (let i = 0; i < 400; i++) {
      const rng = makeRng(i * 7919 + 3);
      for (const stufe of [1, 2, 3, 4]) {
        for (const perfekt of [false, true]) {
          const cm = rollSize(f.id, stufe, perfekt, rng);
          assert.ok(cm >= sp[0] && cm <= sp[1],
            f.id + ': ' + cm + ' cm liegt außerhalb ' + sp.join('–'));
        }
      }
    }
  }
});

test('Bessere Angel und perfekter Anhieb bringen größere Fische', () => {
  // Über viele Würfe gemittelt, nicht am Einzelfall: Der Zufall darf die
  // Richtung nicht umdrehen, muss aber der Hauptanteil bleiben.
  function mittel(stufe, perfekt) {
    let summe = 0;
    const n = 3000;
    for (let i = 0; i < n; i++) {
      summe += rollSize('fish_cod', stufe, perfekt, makeRng(i * 2654435761 >>> 0));
    }
    return summe / n;
  }
  const schwach = mittel(1, false);
  const stark = mittel(4, false);
  const perfekt = mittel(1, true);
  assert.ok(stark > schwach + 1, 'Stufe 4 bringt nicht mehr als Stufe 1');
  assert.ok(perfekt > schwach, 'ein perfekter Anhieb bringt nichts');
});

test('Der Rekord steigt nur nach oben', () => {
  const r = emptyRecords();
  assert.equal(bestSize(r, 'fish_cod'), 0);
  assert.equal(recordCount(r), 0);

  let e = noteSize(r, 'fish_cod', 30);
  assert.equal(e.neu, true);
  assert.equal(e.vorher, 0, 'der erste Fang hat keinen Vorgänger');
  assert.equal(bestSize(r, 'fish_cod'), 30);

  e = noteSize(r, 'fish_cod', 20);
  assert.equal(e.neu, false, 'ein kleinerer Fisch ist kein Rekord');
  assert.equal(bestSize(r, 'fish_cod'), 30);

  e = noteSize(r, 'fish_cod', 30);
  assert.equal(e.neu, false, 'gleich groß ist kein neuer Rekord');

  e = noteSize(r, 'fish_cod', 31);
  assert.equal(e.neu, true);
  assert.equal(e.vorher, 30);
  assert.equal(recordCount(r), 1, 'eine Art, ein Eintrag');
  noteSize(r, 'fish_trout', 12);
  assert.equal(recordCount(r), 2);
});

test('Ein Wort sagt, ob der Fang etwas war', () => {
  const sp = spanneFuer('fish_cod');
  assert.equal(sizeWord('fish_cod', sp[1]), 'ein Prachtstück');
  assert.equal(sizeWord('fish_cod', sp[0]), 'ein Winzling');
  // In der Mitte bleibt es still – sonst wäre jeder Fang eine Meldung wert
  assert.equal(sizeWord('fish_cod', Math.round((sp[0] + sp[1]) / 2)), '');
});

test('Jeder Geist hat ein Lieblingsstück, und es steht auf seiner Liste', () => {
  for (const id of SPIRIT_IDS) {
    const lieb = favouriteOf(id);
    assert.ok(lieb, id + ' hat kein Lieblingsstück');
    assert.ok(getItem(lieb), id + ' mag ' + lieb + ', das es nicht gibt');
    assert.ok(SPIRITS[id].likes.indexOf(lieb) >= 0,
      id + ': das Lieblingsstück steht nicht in seiner Liste');
    assert.equal(isFavourite(id, lieb), true);
    assert.equal(isFavourite(id, 'stone'), false);
    assert.equal(isFavourite(id, null), false);
  }
});

test('Das Lieblingsstück ist nicht das billigste auf der Liste', () => {
  // Sonst wäre die Entscheidung keine: Man verschenkt ohnehin, was am
  // leichtesten nachkommt.
  for (const id of SPIRIT_IDS) {
    const lieb = getItem(favouriteOf(id));
    const andere = SPIRITS[id].likes
      .filter((x) => x !== lieb.id)
      .map((x) => getItem(x).value);
    const billigstes = Math.min.apply(null, andere);
    assert.ok(lieb.value > billigstes,
      id + ': ' + lieb.id + ' (' + lieb.value + ') ist nicht wertvoller als ' + billigstes);
  }
});
