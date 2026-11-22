/**
 * Trampelpfade.
 *
 * Drei Dinge entscheiden darüber, ob das Spiel davon ruckelt oder nicht –
 * und alle drei stehen hier:
 *
 * 1. **Ein Schritt meldet nur dann eine Bildänderung, wenn sich das Bild
 *    wirklich ändert.** Sonst würde bei jedem Schritt ein Bodenstück neu
 *    gebacken, also fünfzig Mal je Sekunde.
 * 2. **Die Liste wächst nicht unbegrenzt.** Ein Spielstand, der mit jeder
 *    Stunde größer wird, ist eine Zeitbombe.
 * 3. **Wege wachsen zu.** Ohne das wäre die Insel nach einem Monat
 *    flächendeckend ausgetreten.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SCHWELLE, DEUTLICH, MAX_SCHRITTE, MAX_KACHELN,
  emptyPfade, pfadeAus, stufe, schritte, tritt, verblassen, pfadStand,
} from '../../src/game/pfade.js';

test('erst nach vielen Schritten sieht man etwas', () => {
  const s = emptyPfade();
  for (let i = 1; i < SCHWELLE; i++) {
    assert.equal(tritt(s, 5, 5), false, 'Schritt ' + i + ' hat das Bild geändert');
    assert.equal(stufe(s, 5, 5), 0);
  }
  assert.equal(tritt(s, 5, 5), true, 'der Schritt, der die Schwelle reißt, meldet sich');
  assert.equal(stufe(s, 5, 5), 1);
});

test('eine zweite Stufe, und dann ist Schluss', () => {
  const s = emptyPfade();
  let meldungen = 0;
  for (let i = 0; i < MAX_SCHRITTE * 3; i++) if (tritt(s, 1, 1)) meldungen++;
  assert.equal(meldungen, 2, 'genau zwei Bildänderungen: angedeutet und deutlich');
  assert.equal(stufe(s, 1, 1), 2);
  assert.equal(schritte(s, 1, 1), MAX_SCHRITTE, 'darüber wird nicht weitergezählt');
});

test('Kacheln stören einander nicht', () => {
  const s = emptyPfade();
  for (let i = 0; i < DEUTLICH; i++) tritt(s, 2, 2);
  assert.equal(stufe(s, 2, 2), 2);
  assert.equal(stufe(s, 3, 2), 0);
  assert.equal(stufe(s, -4, -9), 0);
  for (let i = 0; i < SCHWELLE; i++) tritt(s, -4, -9);
  assert.equal(stufe(s, -4, -9), 1, 'auch negative Koordinaten zählen');
});

test('Wege wachsen zu, und das Bild wird dabei nachgezogen', () => {
  const s = emptyPfade();
  for (let i = 0; i < DEUTLICH; i++) tritt(s, 7, 7);
  assert.equal(stufe(s, 7, 7), 2);
  // Ein Tag genügt, um von „deutlich" auf „angedeutet" zu fallen.
  const g1 = verblassen(s);
  assert.deepEqual(g1, [[7, 7]], 'der Rückfall muss gemeldet werden');
  assert.equal(stufe(s, 7, 7), 1);
  // Und irgendwann ist nichts mehr da.
  for (let i = 0; i < DEUTLICH; i++) verblassen(s);
  assert.equal(stufe(s, 7, 7), 0);
  assert.equal(schritte(s, 7, 7), 0);
  assert.deepEqual(Object.keys(s), [], 'die Kachel ist aus dem Spielstand verschwunden');
});

test('Verblassen meldet nur die Kacheln, die wirklich anders aussehen', () => {
  const s = emptyPfade();
  for (let i = 0; i < SCHWELLE + 5; i++) tritt(s, 1, 1);
  for (let i = 0; i < 3; i++) tritt(s, 2, 2);
  const g = verblassen(s);
  assert.deepEqual(g, [], 'keine der beiden wechselt heute die Stufe');
  assert.equal(schritte(s, 1, 1), SCHWELLE + 4, 'gezählt wird trotzdem herunter');
});

test('der Spielstand wächst nicht unbegrenzt', () => {
  const s = emptyPfade();
  // Viele Kacheln einmal betreten, eine davon oft.
  for (let i = 0; i < DEUTLICH; i++) tritt(s, 0, 0);
  for (let i = 0; i < MAX_KACHELN + 200; i++) tritt(s, i + 1, 0);
  assert.ok(Object.keys(s).length <= MAX_KACHELN,
    'gemerkt werden ' + Object.keys(s).length + ' Kacheln');
  assert.equal(schritte(s, 0, 0), DEUTLICH,
    'der viel begangene Weg überlebt das Aufräumen');
});

test('ein Spielstand von Hand bringt nichts durcheinander', () => {
  const s = pfadeAus({
    '3,4': 20, '5,6': 999, 'quatsch': 10, '7,8': -3, '9,10': 0, '1,x': 5,
  });
  assert.equal(schritte(s, 3, 4), 20);
  assert.equal(schritte(s, 5, 6), MAX_SCHRITTE, 'gekappt');
  assert.equal(Object.keys(s).length, 2, 'Unsinniges fliegt raus');
  assert.deepEqual(pfadeAus(null), {});
});

test('der Stand sagt, wie viel schon zu sehen ist', () => {
  const s = emptyPfade();
  for (let i = 0; i < DEUTLICH; i++) tritt(s, 1, 1);
  for (let i = 0; i < SCHWELLE; i++) tritt(s, 2, 2);
  for (let i = 0; i < 3; i++) tritt(s, 3, 3);
  const st = pfadStand(s);
  assert.equal(st.gemerkt, 3);
  assert.equal(st.sichtbar, 2);
  assert.equal(st.deutlich, 1);
});
