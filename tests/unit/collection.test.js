/**
 * Das Fundbuch.
 *
 * Zwei Zusicherungen: Jeder Gegenstand hat einen Fingerzeig (sonst ist ein
 * leeres Feld nur ein leeres Feld), und keine Reihe zahlt zweimal.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SETS, SET_IDS, setById, itemsOf, progressOf, dueSets, hintFor, HINTS, totalProgress,
} from '../../src/game/collection.js';
import { ITEM_LIST, getItem, CAT } from '../../src/game/items.js';
import { Inventory } from '../../src/game/inventory.js';

test('Jeder Gegenstand hat einen Fingerzeig – und keiner ist erfunden', () => {
  for (const item of ITEM_LIST) {
    const hinweis = HINTS[item.id];
    assert.ok(hinweis, item.id + ' braucht einen Hinweis im Fundbuch');
    assert.ok(hinweis.length > 8 && hinweis.length <= 64,
      item.id + ': Hinweis zu kurz oder zu lang – "' + hinweis + '"');
  }
  // Und andersherum: kein Hinweis zu einem Gegenstand, den es nicht gibt
  for (const id of Object.keys(HINTS)) {
    assert.ok(getItem(id), 'Hinweis für unbekanntes ' + id);
  }
});

test('Jede Reihe deckt genau eine Kategorie ab, und alle zusammen alles', () => {
  const gesehen = Object.create(null);
  let summe = 0;
  for (const s of SETS) {
    assert.ok(s.name && s.note, s.id + ' braucht Name und Zeile');
    assert.ok(s.reward && (s.reward.coins || s.reward.ember), s.id + ' zahlt nichts');
    assert.ok(!gesehen[s.id], 'Kategorie doppelt: ' + s.id);
    gesehen[s.id] = 1;
    const liste = itemsOf(s.id);
    assert.ok(liste.length > 0, s.id + ' ist leer');
    summe += liste.length;
  }
  // Keine Kategorie vergessen: sonst wäre ein Teil des Fundbuchs unerreichbar
  assert.equal(summe, ITEM_LIST.length,
    'die Reihen decken ' + summe + ' von ' + ITEM_LIST.length + ' Dingen ab');
  for (const c of Object.keys(CAT)) {
    assert.ok(SET_IDS.indexOf(CAT[c]) >= 0, 'keine Reihe für ' + CAT[c]);
  }
});

test('Belohnungen verweisen nur auf echte Gegenstände', () => {
  for (const s of SETS) {
    for (const it of (s.reward.items || [])) {
      assert.ok(getItem(it.id), s.id + ' verschenkt unbekanntes ' + it.id);
      assert.ok(it.n > 0);
    }
  }
});

test('Fortschritt zählt Arten, nicht Stückzahl', () => {
  const inv = new Inventory(200);
  const saat = itemsOf(CAT.SEED);
  assert.equal(progressOf(CAT.SEED, inv).have, 0);

  inv.add(saat[0].id, 40);
  const eins = progressOf(CAT.SEED, inv);
  assert.equal(eins.have, 1, 'vierzig Stück sind trotzdem eine Art');
  assert.equal(eins.done, false);

  for (const s of saat) inv.add(s.id, 1);
  const voll = progressOf(CAT.SEED, inv);
  assert.equal(voll.have, voll.total);
  assert.equal(voll.done, true);
});

test('Eine volle Reihe zahlt genau einmal', () => {
  const inv = new Inventory(200);
  for (const s of itemsOf(CAT.SEED)) inv.add(s.id, 1);

  const bezahlt = Object.create(null);
  const erste = dueSets(inv, bezahlt);
  assert.deepEqual(erste.map((s) => s.id), [CAT.SEED]);

  bezahlt[CAT.SEED] = 3;
  assert.deepEqual(dueSets(inv, bezahlt), [], 'einmal abgeholt ist abgeholt');

  // Und der Fund bleibt auch dann bestehen, wenn die Tasche leer ist:
  // das Fundbuch merkt sich, was man je hatte.
  for (const s of itemsOf(CAT.SEED)) inv.remove(s.id, 99);
  assert.equal(progressOf(CAT.SEED, inv).done, true);
});

test('Mehrere Reihen auf einmal werden alle fällig', () => {
  const inv = new Inventory(400);
  for (const s of itemsOf(CAT.SEED)) inv.add(s.id, 1);
  for (const s of itemsOf(CAT.BUG)) inv.add(s.id, 1);
  const faellig = dueSets(inv, Object.create(null)).map((s) => s.id);
  assert.ok(faellig.indexOf(CAT.SEED) >= 0 && faellig.indexOf(CAT.BUG) >= 0,
    'beide Reihen: ' + JSON.stringify(faellig));
});

test('Der Gesamtstand zählt alles, was es gibt', () => {
  const inv = new Inventory(999);
  assert.deepEqual(totalProgress(inv), { have: 0, total: ITEM_LIST.length });
  inv.add('wood', 1);
  assert.equal(totalProgress(inv).have, 1);
});

test('Fingerzeig gibt es auch für Unbekanntes, statt leer zu bleiben', () => {
  assert.ok(hintFor('gibtesnicht').length > 0);
  assert.equal(hintFor('moonflower'), HINTS.moonflower);
});

test('Zu jeder Reihe gehört ein Eintrag, den man nachschlagen kann', () => {
  for (const id of SET_IDS) assert.ok(setById(id), 'setById(' + id + ')');
  assert.equal(setById('quatsch'), null);
});
