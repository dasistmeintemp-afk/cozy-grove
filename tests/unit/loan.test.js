/**
 * Die Vorratstruhe und ihr Ausbau.
 *
 * Kein Kredit im eigentlichen Sinn: keine Zinsen, keine Frist, keine Mahnung.
 * Wer nie einzahlt, verliert nichts – dieselbe Regel wie im Garten. Geprüft
 * wird darum vor allem, dass nie mehr abgebucht wird, als man hat oder
 * schuldet, und dass Ausbaustufen nur vorwärts gehen.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  STAGES, MAX_STAGE, stageOf, slotsAt, nextStage, statusOf, pay, emptyLoan,
} from '../../src/game/loan.js';
import { Inventory } from '../../src/game/inventory.js';

test('Die Stufen steigen in Preis und Nutzen', () => {
  let preis = 0;
  let plaetze = 0;
  for (const s of STAGES) {
    assert.ok(s.cost > preis, s.id + ': wird nicht teurer');
    assert.ok(s.slots > plaetze, s.id + ': bringt nicht mehr Platz');
    assert.ok(s.name && s.note, s.id + ' braucht Name und Zeile');
    preis = s.cost;
    plaetze = s.slots;
  }
  assert.equal(MAX_STAGE, STAGES.length);
  assert.equal(stageOf(99), null);
  assert.equal(slotsAt(0), 0, 'ohne Ausbau keine Fächer');
});

test('Ein neuer Stand steht bei null und schuldet die erste Stufe', () => {
  const l = emptyLoan();
  const st = statusOf(l);
  assert.equal(st.stage, 0);
  assert.equal(st.slots, 0);
  assert.equal(st.ziel, STAGES[0].cost);
  assert.equal(st.offen, STAGES[0].cost);
  assert.equal(st.fertig, false);
  assert.equal(st.naechste.id, 1);
});

test('Es wird nie mehr abgebucht, als man hat', () => {
  const l = emptyLoan();
  const r = pay(l, 5000, 120);
  assert.equal(r.gezahlt, 120, 'mehr als die eigenen Münzen geht nicht');
  assert.equal(statusOf(l).gezahlt, 120);
  assert.equal(r.fertigGeworden, false);
});

test('Und nie mehr, als man schuldet', () => {
  const l = emptyLoan();
  const r = pay(l, 999999, 999999);
  assert.equal(r.gezahlt, STAGES[0].cost, 'genau die offene Summe');
  assert.equal(r.fertigGeworden, true);
  assert.equal(l.stage, 1);
  assert.equal(l.paid, 0, 'nach dem Ausbau fängt die nächste Stufe bei null an');
});

test('In Raten zahlen kommt am selben Ziel an', () => {
  const l = emptyLoan();
  let summe = 0;
  let schutz = 0;
  while (!statusOf(l).fertig && statusOf(l).stage === 0 && schutz++ < 100) {
    summe += pay(l, 50, 99999).gezahlt;
  }
  assert.equal(l.stage, 1);
  assert.equal(summe, STAGES[0].cost, 'in Häppchen genauso teuer wie am Stück');
});

test('Nichts zahlen ändert nichts', () => {
  const l = emptyLoan();
  assert.equal(pay(l, 0, 9999).gezahlt, 0);
  assert.equal(pay(l, -50, 9999).gezahlt, 0);
  assert.equal(pay(l, 100, 0).gezahlt, 0, 'ohne Münzen keine Rate');
  assert.deepEqual(l, emptyLoan());
});

test('Der letzte Ausbau ist der letzte', () => {
  const l = emptyLoan();
  for (let i = 0; i < MAX_STAGE; i++) pay(l, 999999, 999999);
  const st = statusOf(l);
  assert.equal(st.stage, MAX_STAGE);
  assert.equal(st.fertig, true);
  assert.equal(st.offen, 0);
  assert.equal(st.slots, STAGES[MAX_STAGE - 1].slots);
  // Danach nimmt niemand mehr Geld an
  assert.equal(pay(l, 5000, 5000).gezahlt, 0);
  assert.equal(l.stage, MAX_STAGE, 'keine fünfte Stufe aus dem Nichts');
});

test('Der Ausbau ist ein Vorhaben für Wochen, kein Nachmittag', () => {
  const gesamt = STAGES.reduce(function (a, s) { return a + s.cost; }, 0);
  // Zum Vergleich: ein guter Verkaufstag bringt ein paar hundert Münzen.
  assert.ok(gesamt > 8000, 'zu billig: ' + gesamt);
  assert.ok(gesamt < 30000, 'zu teuer, das erreicht niemand: ' + gesamt);
  assert.ok(STAGES[0].cost < 1000, 'die erste Stufe muss in Reichweite sein');
});

test('nextStage zeigt weiter, bis nichts mehr kommt', () => {
  assert.equal(nextStage(0).id, 1);
  assert.equal(nextStage(MAX_STAGE - 1).id, MAX_STAGE);
  assert.equal(nextStage(MAX_STAGE), null);
});

test('Eine Truhe mit null Fächern übersteht das Speichern', () => {
  // `new Inventory(0)` hat null Fächer. Wurde daraus beim Laden dreißig,
  // hatte man ein Lager, für das nie jemand bezahlt hat.
  const leer = new Inventory(0);
  assert.equal(leer.capacity, 0);
  assert.equal(leer.add('wood', 1), 0, 'in null Fächer passt nichts');

  const zurueck = Inventory.fromJSON(leer.toJSON());
  assert.equal(zurueck.capacity, 0, 'null Fächer bleiben null');

  // Und ohne Daten bleibt es bei der Voreinstellung für die Tasche
  assert.equal(Inventory.fromJSON(null).capacity, 30);
  assert.equal(Inventory.fromJSON({ slots: [] }).capacity, 30);
});
