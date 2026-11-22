/**
 * Die Adventszeit.
 *
 * Drei Sorten Prüfung:
 *
 * 1. **Der Inhalt ist echt.** Jede Gabe muss auf einen Gegenstand zeigen,
 *    den es wirklich gibt. Genau daran ist hier schon einmal etwas
 *    gescheitert: Ein Tagesereignis versprach ein `bottle_wash`, das nie
 *    jemand gemalt hatte. Ein Türchen, hinter dem nichts ist, wäre dasselbe
 *    – nur an Weihnachten.
 * 2. **Der Kalender rechnet richtig.** Vor dem Ersten nichts, nach dem
 *    Sechsundzwanzigsten nichts, dazwischen genau der richtige Tag.
 * 3. **Nichts verdirbt und nichts lässt sich vorziehen.** Das sind die
 *    beiden Regeln, die den Kalender ausmachen, und beide stehen hier.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TUERCHEN, ERSTES, LETZTES, MONAT, BAUM_BIS, BAUM_STUFEN,
  tuerchen, adventNummer, istAdvent, istHeiligabend,
  emptyAdvent, adventAus, istOffen, naechstesTuerchen, offeneAnzahl,
  oeffne, lichter, baumStufe, baumText,
} from '../../src/game/advent.js';
import { getItem } from '../../src/game/items.js';

const am = (tag, monat) => new Date(2026, monat == null ? MONAT : monat, tag, 12, 0, 0);

test('es sind genau vierundzwanzig, lückenlos nummeriert', () => {
  assert.equal(TUERCHEN.length, LETZTES);
  for (let nr = ERSTES; nr <= LETZTES; nr++) {
    assert.equal(TUERCHEN[nr - 1].tag, nr, 'Türchen ' + nr + ' sitzt nicht an seinem Platz');
    assert.ok(tuerchen(nr), 'Türchen ' + nr + ' fehlt');
  }
  assert.equal(tuerchen(0), null);
  assert.equal(tuerchen(25), null);
});

test('jedes Türchen hat einen eigenen Satz', () => {
  const gesehen = new Set();
  for (const t of TUERCHEN) {
    assert.ok(t.text && t.text.length > 20, 'Türchen ' + t.tag + ' hat kaum Text');
    assert.ok(t.text.length < 200, 'Türchen ' + t.tag + ' ist eine Erzählung, kein Türchen');
    assert.ok(!gesehen.has(t.text), 'Türchen ' + t.tag + ' sagt dasselbe wie ein anderes');
    gesehen.add(t.text);
  }
});

test('hinter jeder Gabe steckt ein Gegenstand, den es gibt', () => {
  for (const t of TUERCHEN) {
    if (!t.gabe) continue;
    const g = t.gabe;
    for (const k in g) {
      assert.ok(k === 'items' || k === 'coins' || k === 'ember',
        'Türchen ' + t.tag + ' hat ein unbekanntes Feld: ' + k);
    }
    for (const stk of g.items || []) {
      assert.ok(getItem(stk.id), 'Türchen ' + t.tag + ' verspricht „' + stk.id + '" – das gibt es nicht');
      assert.ok(stk.n >= 1 && stk.n <= 5, 'Türchen ' + t.tag + ': ' + stk.n + ' Stück sind zu viel für ein Türchen');
    }
    if (g.coins != null) assert.ok(g.coins > 0 && g.coins <= 100);
    if (g.ember != null) assert.ok(g.ember > 0 && g.ember <= 20);
  }
});

test('ein paar Türchen haben nur einen Satz und sonst nichts', () => {
  // Ein Kalender, aus dem JEDEN Tag etwas fällt, ist ein Automat. Diese
  // Prüfung hält die leeren Tage fest, damit sie niemand „vergisst".
  const leer = TUERCHEN.filter((t) => !t.gabe).length;
  assert.ok(leer >= 3, 'kein einziges Türchen kommt ohne Ware aus');
  assert.ok(leer <= 8, 'zu viele leere Türchen');
});

test('der Kalender läuft vom Ersten bis zum Sechsundzwanzigsten', () => {
  assert.equal(adventNummer(am(30, 10)), 0, 'der 30. November ist noch nichts');
  assert.equal(adventNummer(am(1)), 1);
  assert.equal(adventNummer(am(12)), 12);
  assert.equal(adventNummer(am(24)), 24);
  assert.equal(adventNummer(am(BAUM_BIS)), 24, 'zwischen den Jahren bleibt es bei 24');
  assert.equal(adventNummer(am(27)), 0, 'am 27. ist die Tanne weg');
  assert.equal(adventNummer(am(2, 0)), 0, 'im Januar auch');
  assert.equal(istAdvent(am(5)), true);
  assert.equal(istAdvent(am(5, 5)), false);
  assert.equal(istHeiligabend(am(24)), true);
  assert.equal(istHeiligabend(am(23)), false);
  assert.equal(istHeiligabend(am(24, 10)), false);
});

test('verpasste Türchen bleiben offen', () => {
  // Wer am Zwanzigsten zum ersten Mal hereinschaut, findet zwanzig vor.
  const s = emptyAdvent();
  assert.equal(offeneAnzahl(s, am(20)), 20);
  assert.equal(naechstesTuerchen(s, am(20)), 1, 'nachgeholt wird der Reihe nach, von vorn');
  assert.ok(oeffne(s, 1, am(20)));
  assert.equal(naechstesTuerchen(s, am(20)), 2);
  assert.equal(offeneAnzahl(s, am(20)), 19);
});

test('vorgreifen geht nicht', () => {
  const s = emptyAdvent();
  assert.equal(oeffne(s, 23, am(2)), null, 'der 23. ist am 2. noch zu');
  assert.equal(lichter(s), 0, 'und bleibt zu');
  assert.equal(oeffne(s, 2, am(2)) && oeffne(s, 2, am(2)), null, 'zweimal öffnen geht auch nicht');
  assert.equal(lichter(s), 1);
});

test('außerhalb des Dezembers lässt sich nichts öffnen', () => {
  const s = emptyAdvent();
  assert.equal(oeffne(s, 1, am(15, 6)), null);
  assert.equal(naechstesTuerchen(s, am(15, 6)), 0);
  assert.equal(lichter(s), 0);
});

test('ein geöffnetes Türchen gibt seinen Satz heraus', () => {
  const s = emptyAdvent();
  const t = oeffne(s, 1, am(1));
  assert.equal(t.tag, 1);
  assert.ok(t.text.length > 20);
  assert.equal(istOffen(s, 1), true);
  assert.equal(istOffen(s, 2), false);
});

test('der Baum wächst in fünf Stufen und ist erst am Ende voll', () => {
  const s = emptyAdvent();
  assert.equal(baumStufe(s), 0, 'ohne Licht ist er kahl');
  let letzte = 0;
  for (let nr = ERSTES; nr <= LETZTES; nr++) {
    oeffne(s, nr, am(nr));
    const st = baumStufe(s);
    assert.ok(st >= letzte, 'der Baum darf nie zurückgehen');
    assert.ok(st < BAUM_STUFEN);
    letzte = st;
  }
  assert.equal(lichter(s), LETZTES);
  assert.equal(baumStufe(s), BAUM_STUFEN - 1, 'die volle Stufe gibt es erst mit dem letzten Türchen');

  // Und zwar WIRKLICH erst mit dem letzten: bei 23 noch nicht.
  const fast = emptyAdvent();
  for (let nr = ERSTES; nr < LETZTES; nr++) oeffne(fast, nr, am(nr));
  assert.ok(baumStufe(fast) < BAUM_STUFEN - 1);
});

test('ein Spielstand von Hand lässt den Baum nicht überlaufen', () => {
  const s = adventAus({ offen: [3, 3, 99, -1, 0, 'x', null, 7.9, 12] });
  assert.deepEqual(s.offen, [3, 7, 12], 'Doppeltes, Unsinniges und Ausgedachtes fliegt raus');
  assert.equal(lichter(s), 3);
  assert.deepEqual(adventAus(null).offen, []);
  assert.deepEqual(adventAus({}).offen, []);
});

test('am Baum steht, was los ist', () => {
  const s = emptyAdvent();
  assert.match(baumText(s, am(1)), /Türchen ist noch zu/);
  oeffne(s, 1, am(1));
  assert.match(baumText(s, am(1)), /Ein Licht brennt/);
  assert.match(baumText(s, am(3)), /2 Türchen sind noch zu/);
  for (let nr = ERSTES; nr <= LETZTES; nr++) oeffne(s, nr, am(24));
  assert.match(baumText(s, am(24)), /Alle vierundzwanzig/);
});
