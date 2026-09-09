/**
 * Der Katalog.
 *
 * Er trägt drei Lasten auf einmal: Er ist die Quelle der meisten Deko, das
 * große Ziel für Münzen und der Grund, morgens zum Briefkasten zu gehen.
 * Deshalb prüfen die Tests nicht nur, dass Bestellen funktioniert, sondern
 * auch, dass der Katalog nicht auf erfundene Gegenstände zeigt und dass eine
 * fällige Lieferung genau einmal kommt.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  KATALOG, MAX_OFFEN, katalogEintrag, katalogFuer, kannBestellen,
  bestellen, faellig, emptyOrders,
} from '../../src/game/catalog.js';
import { getItem, CAT } from '../../src/game/items.js';
import { MILESTONES } from '../../src/game/milestones.js';

const ALLE = function () { return true; };
const KEINE = function () { return false; };

test('Jeder Eintrag zeigt auf echte Deko und echte Meilensteine', () => {
  const meilen = Object.create(null);
  for (const m of MILESTONES) meilen[m.id] = true;
  for (const e of KATALOG) {
    const item = getItem(e.id);
    assert.ok(item, e.id + ' steht im Katalog, gibt es aber nicht');
    assert.equal(item.cat, CAT.DECOR, e.id + ' ist keine Deko');
    assert.ok(item.prop, e.id + ' hat keine Weltgrafik zum Hinstellen');
    assert.ok(e.preis > 0, e.id + ' kostet nichts');
    if (e.needs) assert.ok(meilen[e.needs], e.id + ' braucht ' + e.needs + ', den es nicht gibt');
  }
});

test('Versand kostet: der Katalogpreis liegt über dem Sammlerwert', () => {
  for (const e of KATALOG) {
    const item = getItem(e.id);
    assert.ok(e.preis > item.value,
      e.id + ': ' + e.preis + ' ist nicht mehr als der Wert ' + item.value);
  }
});

test('Gesperrtes bleibt sichtbar, aber nicht bestellbar', () => {
  const zu = katalogFuer(KEINE);
  const auf = katalogFuer(ALLE);
  assert.equal(zu.length, auf.length, 'die Seite wird nicht kürzer');
  assert.equal(auf.filter((e) => e.offen).length, KATALOG.length);
  const gesperrt = zu.filter((e) => !e.offen);
  assert.ok(gesperrt.length > 0, 'am Anfang ist etwas zu');
  assert.ok(zu.some((e) => e.offen), 'am Anfang ist auch etwas offen');
});

test('Bestellen braucht Münzen, einen Platz und den Meilenstein', () => {
  const teuer = KATALOG[KATALOG.length - 1];
  const billig = KATALOG[0];

  assert.equal(kannBestellen('gibtsnicht', 9999, [], ALLE).ok, false);
  assert.equal(kannBestellen(billig.id, billig.preis - 1, [], ALLE).ok, false);
  assert.equal(kannBestellen(billig.id, billig.preis, [], ALLE).ok, true);
  // Genau der Preis reicht – ein Vergleich mit > statt >= wäre hier falsch.
  assert.equal(kannBestellen(teuer.id, 99999, [], KEINE).ok, false,
    'ohne Meilenstein geht es nicht');

  const voll = [];
  for (let i = 0; i < MAX_OFFEN; i++) voll.push({ nr: 'x' + i, id: billig.id, ab: 5 });
  assert.equal(kannBestellen(billig.id, 99999, voll, ALLE).ok, false, 'Postfach voll');
  assert.equal(kannBestellen(billig.id, 99999, voll.slice(1), ALLE).ok, true);
});

test('Bestellt heute heißt geliefert morgen', () => {
  const b = bestellen(KATALOG[0].id, 7);
  assert.equal(b.ab, 8);
  assert.equal(b.preis, KATALOG[0].preis);
  assert.equal(bestellen('gibtsnicht', 7), null);
});

test('Eine Lieferung kommt genau einmal', () => {
  let offen = emptyOrders();
  offen = offen.concat([bestellen(KATALOG[0].id, 3), bestellen(KATALOG[1].id, 5)]);

  let r = faellig(offen, 3);
  assert.equal(r.da.length, 0, 'am Bestelltag noch nichts');
  assert.equal(r.bleibt.length, 2);

  r = faellig(offen, 4);
  assert.equal(r.da.length, 1, 'das erste Paket ist da');
  assert.equal(r.da[0].id, KATALOG[0].id);
  offen = r.bleibt;

  // Dasselbe Paket darf morgen nicht noch einmal kommen
  r = faellig(offen, 5);
  assert.equal(r.da.length, 0);
  r = faellig(offen, 6);
  assert.equal(r.da.length, 1);
  assert.equal(r.da[0].id, KATALOG[1].id);
  assert.equal(r.bleibt.length, 0);
});

test('Bestellnummern wiederholen sich nicht', () => {
  const a = bestellen(KATALOG[0].id, 1);
  const b = bestellen(KATALOG[0].id, 1);
  assert.notEqual(a.nr, b.nr);
});

test('Der Katalog wächst mit der Insel', () => {
  // Ohne Staffelung wäre am ersten Tag alles da – und danach nichts mehr neu.
  const ohne = KATALOG.filter((e) => !e.needs).length;
  assert.ok(ohne >= 3, 'am Anfang muss etwas bestellbar sein');
  assert.ok(ohne < KATALOG.length, 'es darf nicht von Anfang an alles offen sein');
  // Teureres steht weiter hinten: die Liste ist nach Preis sortiert
  for (let i = 1; i < KATALOG.length; i++) {
    assert.ok(KATALOG[i].preis >= KATALOG[i - 1].preis,
      KATALOG[i].id + ' ist billiger als der Eintrag davor');
  }
});

test('Die Preise sind ein echtes Ziel für Münzen', () => {
  const summe = KATALOG.reduce((n, e) => n + e.preis, 0);
  assert.ok(summe > 3000, 'der ganze Katalog kostet nur ' + summe + ' Münzen');
});
