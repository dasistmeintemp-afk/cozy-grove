/**
 * Abzeichen – zehn Stück, vierzig Stufen, keine eigene Buchführung.
 *
 * Drei Sorten Prüfung, und die zweite ist die, die wirklich etwas abfängt:
 *
 * 1. **Form.** Steigende Schwellen, vier Namen, eindeutige Kennungen.
 * 2. **Die letzte Stufe ist erreichbar.** Wo es eine Obergrenze gibt – 127
 *    Arten, 9 Sammelreihen, 8 Fischarten, 8 Orte, 8 Sternbilder, 43
 *    Momente –, muss die höchste Schwelle genau dort liegen. Das ist die
 *    Prüfung, die beim nächsten neuen Moment anschlägt: Kommt einer dazu,
 *    steht „43 von 44" für immer da, und niemand merkt es von allein.
 * 3. **Einmal erreicht, bleibt erreicht.** Trampelpfade verwachsen. Ein
 *    Abzeichen, das wieder weggeht, wäre ein Wortbruch.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ABZEICHEN, ABZEICHEN_IDS, FAMILIEN, FAMILIE_IDS, LOHN, STUFEN,
  STUFEN_GESAMT, abzeichenVon, emptyAbzeichen, abzeichenAus,
  stufeFuerWert, stufeVon, faellig, merke, abzeichenStand, stufenGesamt,
} from '../../src/game/abzeichen.js';
import { artenStand } from '../../src/game/chronik.js';
import { SETS } from '../../src/game/collection.js';
import { ITEM_LIST, CAT } from '../../src/game/items.js';
import { MAX as ORTE_MAX } from '../../src/game/orte.js';
import { STERNBILDER } from '../../src/game/sternbilder.js';
import { MOMENTE } from '../../src/game/momente.js';

test('Jedes Abzeichen hat Hand und Fuß', () => {
  const ids = Object.create(null);
  for (const a of ABZEICHEN) {
    assert.ok(!ids[a.id], 'doppelte Kennung ' + a.id);
    ids[a.id] = 1;
    assert.ok(FAMILIE_IDS.indexOf(a.familie) >= 0, a.id + ': unbekannte Familie');
    assert.ok(a.icon && a.icon.indexOf('icon_') === 0, a.id + ': kein Bildchen');
    assert.ok(a.name && a.name.length <= 24, a.id + ': Name zu lang');
    assert.ok(a.was && a.was.length > 4, a.id + ': sagt nicht, was gezählt wird');
    assert.equal(a.schwellen.length, STUFEN, a.id + ': falsche Stufenzahl');
    assert.equal(a.namen.length, STUFEN, a.id + ': nicht jede Stufe hat einen Namen');
    let vorher = 0;
    for (let i = 0; i < a.schwellen.length; i++) {
      assert.ok(a.schwellen[i] > vorher, a.id + ': Schwelle ' + i + ' steigt nicht');
      vorher = a.schwellen[i];
      assert.ok(a.namen[i] && a.namen[i].length <= 26, a.id + ': Stufenname ' + i);
    }
    // Der Wert kommt aus der Lage und wird nicht ausgerechnet.
    assert.equal(a.wert({}), 0, a.id + ': leere Lage ist nicht 0');
    assert.equal(a.wert({ [a.id]: 7 }), 7, a.id + ': liest sein eigenes Feld nicht');
  }
  assert.equal(ABZEICHEN_IDS.length, ABZEICHEN.length);
  assert.equal(STUFEN_GESAMT, ABZEICHEN.length * STUFEN);
  assert.equal(LOHN.length, STUFEN);
  // Jede Familie ist besetzt – eine leere Überschrift wäre ein leeres Fach.
  for (const f of FAMILIEN) {
    assert.ok(ABZEICHEN.some((a) => a.familie === f.id), f.id + ': keine Abzeichen darin');
  }
  assert.equal(abzeichenVon('gibtesnicht'), null);
  assert.equal(abzeichenVon(ABZEICHEN_IDS[0]).id, ABZEICHEN_IDS[0]);
});

test('Die letzte Stufe ist wirklich erreichbar', () => {
  // Jede dieser Zahlen kommt aus dem System, das sie zählt – nicht aus
  // dieser Datei. Wächst der Inhalt, schlägt diese Prüfung an, und zwar
  // bevor jemand monatelang auf „43 von 44" starrt.
  const deckel = {
    arten: artenStand({}).gibt,
    reihen: SETS.length,
    fische: ITEM_LIST.filter((i) => i.cat === CAT.FISH).length,
    orte: ORTE_MAX,
    sterne: STERNBILDER.length,
    momente: MOMENTE.length,
  };
  for (const id in deckel) {
    const a = abzeichenVon(id);
    assert.ok(a, 'Abzeichen ' + id + ' fehlt');
    assert.equal(a.schwellen[STUFEN - 1], deckel[id],
      id + ': letzte Stufe ' + a.schwellen[STUFEN - 1] + ', möglich sind ' + deckel[id]);
  }
  // Und die ohne Deckel bleiben im Rahmen dessen, was ein langes Spiel
  // hergibt: rund fünfzehn erfüllte Bitten am Tag (dasselbe Tempomodell
  // wie bei den Meilensteinen), also 600 Bitten in gut vierzig Tagen.
  assert.ok(abzeichenVon('bitten').schwellen[STUFEN - 1] <= 15 * 100);
  assert.ok(abzeichenVon('tage').schwellen[STUFEN - 1] <= 150);
  // Die Pfade: Das Sternnetz vom Lager zu allen acht Geistern ist 397
  // Kacheln breit, die Insel merkt sich höchstens 600.
  assert.ok(abzeichenVon('pfade').schwellen[STUFEN - 1] < 397);
});

test('Jede Stufe kommt genau einmal', () => {
  const a = abzeichenVon('sterne');
  const stand = emptyAbzeichen();
  let gesehen = 0;
  const namen = [];
  for (let n = 0; n <= a.schwellen[STUFEN - 1] + 3; n++) {
    const neu = faellig({ sterne: n }, stand);
    for (const f of neu) {
      assert.equal(f.abzeichen.id, 'sterne');
      namen.push(f.name);
      gesehen++;
      merke(stand, f.abzeichen.id, f.stufe);
    }
  }
  assert.equal(gesehen, STUFEN, 'nicht jede Stufe kam, oder eine doppelt');
  assert.deepEqual(namen, a.namen);
  assert.equal(stufeVon(stand, 'sterne'), STUFEN);
  // Und darüber hinaus kommt nichts mehr.
  assert.deepEqual(faellig({ sterne: 999 }, stand), []);
});

test('Ein alter Spielstand holt mehrere Stufen auf einmal', () => {
  // Wer die Abzeichen erst bekommt, wenn er schon hundert Tage hier ist,
  // soll alle vier Stufen bekommen und nicht nur die oberste – dieselbe
  // Entscheidung wie bei `dueAt` in `milestones.js`.
  const neu = faellig({ tage: 120 }, emptyAbzeichen());
  const tage = neu.filter((f) => f.abzeichen.id === 'tage');
  assert.equal(tage.length, STUFEN);
  assert.deepEqual(tage.map((f) => f.stufe), [1, 2, 3, 4]);
  // Von unten nach oben, damit die Meldung nicht rückwärts läuft.
  assert.deepEqual(tage.map((f) => f.lohn), LOHN);
});

test('Ein verwachsener Pfad nimmt das Abzeichen nicht wieder weg', () => {
  // Der Grund, warum im Spielstand Stufen stehen und keine Werte:
  // `pfade.js` lässt jede Kachel täglich einen Schritt verblassen.
  const stand = emptyAbzeichen();
  for (const f of faellig({ pfade: 200 }, stand)) merke(stand, f.abzeichen.id, f.stufe);
  const hatte = stufeVon(stand, 'pfade');
  assert.ok(hatte >= 3, 'bei 200 Kacheln sollten drei Stufen stehen');
  // Alles verwachsen.
  assert.deepEqual(faellig({ pfade: 0 }, stand), []);
  assert.equal(stufeVon(stand, 'pfade'), hatte, 'die Stufe ist weg');
  // Und die Anzeige zeigt trotzdem die Wahrheit: Wert 0, Stufe bleibt.
  const zeile = abzeichenStand({ pfade: 0 }, stand)
    .find((f) => f.id === 'erkunden').zeilen.find((z) => z.id === 'pfade');
  assert.equal(zeile.wert, 0);
  assert.equal(zeile.stufe, hatte);
  assert.ok(zeile.titel, 'der erreichte Stufenname fehlt');
});

test('merke geht nur nach oben', () => {
  const stand = emptyAbzeichen();
  merke(stand, 'tage', 3);
  merke(stand, 'tage', 1);
  assert.equal(stufeVon(stand, 'tage'), 3);
  merke(stand, 'tage', 9);
  assert.equal(stufeVon(stand, 'tage'), STUFEN, 'über die oberste Stufe hinaus');
  assert.equal(stufeVon(stand, 'gibtesnicht'), 0);
});

test('Ein kaputter Spielstand wird gesäubert', () => {
  const roh = { tage: 2, pfade: '3', bitten: 99, unsinn: 4, arten: -1, sterne: null };
  const rein = abzeichenAus(roh);
  assert.equal(rein.tage, 2);
  assert.equal(rein.pfade, 3, 'eine Zahl als Text zählt trotzdem');
  assert.equal(rein.bitten, STUFEN, 'über die oberste Stufe hinaus');
  assert.equal(rein.unsinn, undefined, 'unbekannte Kennung bleibt stehen');
  assert.equal(rein.arten, undefined);
  assert.equal(rein.sterne, undefined);
  assert.deepEqual(abzeichenAus(null), emptyAbzeichen());
  assert.deepEqual(abzeichenAus('kaputt'), emptyAbzeichen());
  // Und die Zählung stimmt danach.
  assert.equal(stufenGesamt(rein).erreicht, 2 + 3 + STUFEN);
  assert.equal(stufenGesamt(rein).gesamt, STUFEN_GESAMT);
  assert.equal(stufenGesamt(emptyAbzeichen()).erreicht, 0);
});

test('stufeFuerWert trifft die Grenzen genau', () => {
  const a = abzeichenVon('orte');
  for (let i = 0; i < STUFEN; i++) {
    assert.equal(stufeFuerWert(a, a.schwellen[i]), i + 1,
      'genau auf der Schwelle ' + a.schwellen[i] + ' zählt nicht');
    assert.equal(stufeFuerWert(a, a.schwellen[i] - 1), i,
      'einen darunter zählt schon');
  }
  assert.equal(stufeFuerWert(a, 0), 0);
});

test('Die Anzeige sagt, wie viel noch fehlt – und schweigt, wenn nichts fehlt', () => {
  const stand = emptyAbzeichen();
  const lage = { sterne: 3 };
  for (const f of faellig(lage, stand)) merke(stand, f.abzeichen.id, f.stufe);
  const z = abzeichenStand(lage, stand)
    .find((f) => f.id === 'erkunden').zeilen.find((x) => x.id === 'sterne');
  assert.equal(z.stufe, 1);
  assert.equal(z.naechste, 4);
  assert.equal(z.fehlt, 1);
  // Volles Abzeichen: keine nächste Schwelle mehr.
  const voll = emptyAbzeichen();
  const vollLage = { sterne: 8 };
  for (const f of faellig(vollLage, voll)) merke(voll, f.abzeichen.id, f.stufe);
  const zv = abzeichenStand(vollLage, voll)
    .find((f) => f.id === 'erkunden').zeilen.find((x) => x.id === 'sterne');
  assert.equal(zv.naechste, null);
  assert.equal(zv.fehlt, 0);
  assert.equal(zv.titel, abzeichenVon('sterne').namen[STUFEN - 1]);
});

test('Die Glut aus allen Abzeichen dreht die Wirtschaft nicht um', () => {
  // Ein Auftrag bringt ein bis fünf Glut, ein Bauplan kostet drei bis
  // vier. Bei rund fünfzehn Aufträgen am Tag sind das etwa 45 Glut
  // täglich. Alles, was die Abzeichen je hergeben, darf nicht mehr sein
  // als ein paar Tagesverdienste – sonst wäre es kein Dankeschön mehr,
  // sondern eine Abkürzung.
  let summe = 0;
  for (let i = 0; i < LOHN.length; i++) summe += LOHN[i];
  const gesamt = summe * ABZEICHEN.length;
  assert.ok(gesamt <= 45 * 15, 'zu viel Glut: ' + gesamt);
  assert.ok(gesamt >= 45 * 5, 'zu wenig, um sich danach zu bücken: ' + gesamt);
  // Und sie steigt mit der Stufe: Die vierte soll mehr wert sein als die erste.
  for (let i = 1; i < LOHN.length; i++) assert.ok(LOHN[i] > LOHN[i - 1]);
});
